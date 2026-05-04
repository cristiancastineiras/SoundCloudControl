import type { SolicitudBackground } from './contratos';
import {
  crearEstadoEqualizador,
  normalizarAjustesEqualizador,
  type AjustesEqualizador,
  type EstadoEqualizador,
} from './equalizer';
import {
  CANAL_LISTO_EQUALIZADOR,
  CANAL_RESPUESTA_EQUALIZADOR,
  CANAL_SOLICITUD_EQUALIZADOR,
  esMensajeListoEqualizador,
  esRespuestaPuenteEqualizador,
  type SolicitudPuenteEqualizador,
} from './equalizerBridge';

const PREFIJO_LOG_EQ = '[EQ][CS]';
const TIEMPO_ESPERA_SOLICITUD_MS = 1500;
const TIEMPO_ESPERA_BRIDGE_MS = 4000;

let secuenciaSolicitud = 0;

export function crearGestorEqualizadorContenido() {
  let ajustes = normalizarAjustesEqualizador(undefined);
  let inicializacion: Promise<void> | null = null;
  let bridgeDisponible = false;
  let ultimaFirmaEstado = '';
  let ultimoError: string | null = null;

  window.addEventListener('message', (evento) => {
    if (evento.source !== window || !esMensajeListoEqualizador(evento.data)) {
      return;
    }

    if (!bridgeDisponible) {
      bridgeDisponible = true;
      logEq('bridge-listo', { canal: CANAL_LISTO_EQUALIZADOR });
    }
  });

  function resumirAjustes(origen: AjustesEqualizador) {
    return {
      habilitado: origen.habilitado,
      presetId: origen.presetId,
      preamp: origen.preamp,
      bandasActivas: Object.entries(origen.bandas)
        .filter(([, ganancia]) => ganancia !== 0)
        .map(([id, ganancia]) => `${id}:${ganancia}`),
    };
  }

  function normalizarError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  function logEq(evento: string, detalles?: unknown) {
    if (detalles === undefined) {
      console.log(PREFIJO_LOG_EQ, evento);
      return;
    }

    console.log(PREFIJO_LOG_EQ, evento, detalles);
  }

  function errorEq(evento: string, error: unknown, detalles?: unknown) {
    const mensaje = normalizarError(error);
    ultimoError = mensaje;

    if (detalles === undefined) {
      console.error(PREFIJO_LOG_EQ, evento, mensaje);
      return;
    }

    console.error(PREFIJO_LOG_EQ, evento, mensaje, detalles);
  }

  function crearEstadoLocal(parche?: Partial<EstadoEqualizador>) {
    return crearEstadoEqualizador({
      ...ajustes,
      audioDetectado: false,
      procesando: false,
      requiereInteraccion: false,
      estadoContexto: 'unavailable',
      ...parche,
    });
  }

  function registrarEstado(motivo: string, estado: EstadoEqualizador) {
    const snapshot = {
      motivo,
      bridgeDisponible,
      ultimoError,
      ajustes: resumirAjustes(ajustes),
      estado: {
        audioDetectado: estado.audioDetectado,
        procesando: estado.procesando,
        requiereInteraccion: estado.requiereInteraccion,
        estadoContexto: estado.estadoContexto,
      },
    };
    const firma = JSON.stringify(snapshot);

    if (firma === ultimaFirmaEstado) {
      return;
    }

    ultimaFirmaEstado = firma;
    logEq('estado', snapshot);
  }

  async function leerAjustesGuardados() {
    try {
      const respuesta = await browser.runtime.sendMessage({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'obtener-configuracion-equalizador',
      } satisfies SolicitudBackground);

      const ajustesGuardados = normalizarAjustesEqualizador(respuesta);
      logEq('ajustes-cargados', resumirAjustes(ajustesGuardados));
      return ajustesGuardados;
    } catch (error) {
      errorEq('ajustes-cargar-fallo', error);
      return normalizarAjustesEqualizador(undefined);
    }
  }

  function crearIdSolicitud() {
    secuenciaSolicitud += 1;
    return `sc-eq-${Date.now()}-${secuenciaSolicitud}`;
  }

  function esperar(ms: number) {
    return new Promise<void>((resolver) => {
      window.setTimeout(resolver, ms);
    });
  }

  async function enviarSolicitudPuente(
    solicitud:
      | Omit<Extract<SolicitudPuenteEqualizador, { tipo: 'ping' }>, 'canal' | 'id'>
      | Omit<Extract<SolicitudPuenteEqualizador, { tipo: 'obtener-estado' }>, 'canal' | 'id'>
      | Omit<Extract<SolicitudPuenteEqualizador, { tipo: 'aplicar-ajustes' }>, 'canal' | 'id'>,
    timeoutMs = TIEMPO_ESPERA_SOLICITUD_MS,
  ) {
    const id = crearIdSolicitud();

    return new Promise<EstadoEqualizador | null>((resolver, rechazar) => {
      let temporizador: number | null = null;

      const manejarRespuesta = (evento: MessageEvent) => {
        if (evento.source !== window || !esRespuestaPuenteEqualizador(evento.data)) {
          return;
        }

        if (evento.data.id !== id) {
          return;
        }

        limpiar();
        bridgeDisponible = true;

        if (!evento.data.ok) {
          rechazar(new Error(evento.data.error));
          return;
        }

        if (evento.data.tipo === 'ping') {
          resolver(null);
          return;
        }

        resolver(crearEstadoEqualizador(evento.data.estado));
      };

      const limpiar = () => {
        window.removeEventListener('message', manejarRespuesta);

        if (temporizador !== null) {
          window.clearTimeout(temporizador);
        }
      };

      window.addEventListener('message', manejarRespuesta);
      temporizador = window.setTimeout(() => {
        limpiar();
        rechazar(new Error(`Tiempo de espera agotado en ${solicitud.tipo}`));
      }, timeoutMs);

      window.postMessage(
        {
          canal: CANAL_SOLICITUD_EQUALIZADOR,
          id,
          ...solicitud,
        } satisfies SolicitudPuenteEqualizador,
        '*',
      );
    });
  }

  async function asegurarBridgeDisponible(motivo: string) {
    if (bridgeDisponible) {
      return;
    }

    const inicio = Date.now();
    let ultimoFallo: unknown = null;

    logEq('bridge-esperando', { motivo });

    while (Date.now() - inicio < TIEMPO_ESPERA_BRIDGE_MS) {
      try {
        await enviarSolicitudPuente({ tipo: 'ping' }, 700);
        bridgeDisponible = true;
        logEq('bridge-disponible', { motivo });
        return;
      } catch (error) {
        ultimoFallo = error;
        await esperar(120);
      }
    }

    throw ultimoFallo instanceof Error
      ? ultimoFallo
      : new Error(`El bridge del equalizador no estuvo disponible durante ${motivo}`);
  }

  async function consultarEstadoPuente(motivo: string) {
    const estado = await enviarSolicitudPuente({ tipo: 'obtener-estado' });
    const estadoFinal = estado ?? crearEstadoLocal();
    ajustes = normalizarAjustesEqualizador(estadoFinal);
    registrarEstado(motivo, estadoFinal);
    return estadoFinal;
  }

  async function aplicarAjustesPuente(
    ajustesSiguientes: AjustesEqualizador,
    motivo: string,
  ) {
    const estado = await enviarSolicitudPuente({
      tipo: 'aplicar-ajustes',
      ajustes: ajustesSiguientes,
    });
    const estadoFinal = estado ?? crearEstadoLocal();
    ajustes = normalizarAjustesEqualizador(estadoFinal);
    registrarEstado(motivo, estadoFinal);
    return estadoFinal;
  }

  async function inicializarInterno() {
    logEq('inicializando');
    ajustes = await leerAjustesGuardados();
    await asegurarBridgeDisponible('inicializar');
    await aplicarAjustesPuente(ajustes, 'inicializar');
  }

  async function asegurarInicializado() {
    if (!inicializacion) {
      inicializacion = inicializarInterno();
    }

    await inicializacion;
  }

  async function inicializar() {
    try {
      await asegurarInicializado();
    } catch (error) {
      errorEq('inicializacion-fallo', error, {
        ajustes: resumirAjustes(ajustes),
      });
    }
  }

  async function obtenerEstado(): Promise<EstadoEqualizador> {
    try {
      await asegurarInicializado();
      await asegurarBridgeDisponible('obtener-estado');
      return await consultarEstadoPuente('consultar-estado');
    } catch (error) {
      errorEq('estado-consulta-fallo', error, {
        ajustes: resumirAjustes(ajustes),
      });

      const estado = crearEstadoLocal();
      registrarEstado('consultar-estado:fallback', estado);
      return estado;
    }
  }

  async function aplicarAjustes(
    ajustesSiguientes: AjustesEqualizador,
  ): Promise<EstadoEqualizador> {
    const ajustesNormalizados = normalizarAjustesEqualizador(ajustesSiguientes);

    logEq('aplicar-ajustes', {
      anterior: resumirAjustes(ajustes),
      siguiente: resumirAjustes(ajustesNormalizados),
    });

    ajustes = ajustesNormalizados;
    ultimoError = null;

    try {
      await asegurarInicializado();
      await asegurarBridgeDisponible('aplicar-ajustes');
      return await aplicarAjustesPuente(ajustesNormalizados, 'aplicar-ajustes');
    } catch (error) {
      errorEq('aplicar-ajustes-fallo', error, {
        ajustes: resumirAjustes(ajustesNormalizados),
        canalRespuesta: CANAL_RESPUESTA_EQUALIZADOR,
      });

      const estado = crearEstadoLocal();
      registrarEstado('aplicar-ajustes:fallback', estado);
      return estado;
    }
  }

  return {
    aplicarAjustes,
    inicializar,
    obtenerEstado,
  };
}