/**
 * Background script — router fino entre el popup, el content script y los
 * servicios/feature modules.
 *
 * Aquí no debe vivir lógica de negocio: toda la pieza pesada está en
 * `infrastructure/*`, `services/*` y `features/descarga/*`.
 */
import {
  ACCIONES_POR_COMANDO,
  esComandoRapido,
  type AccionReproductor,
  type EstadoCancion,
  type ComandoRapido,
} from '@/entities/reproductor';
import {
  type AjustesEqualizador,
  type EstadoEqualizador,
  crearEstadoEqualizador,
  normalizarAjustesEqualizador,
} from '@/entities/equalizador';
import {
  crearRespuestaEqualizador,
  crearRespuestaPopup,
  esSolicitudBackground,
  type RespuestaDescarga,
  type RespuestaEqualizador,
  type RespuestaPopup,
  type SolicitudBackground,
} from '@/services/mensajeria';
import {
  asegurarPestanaSoundCloud,
  enviarSolicitudContenido,
  guardarAjustesEqualizador,
  inyectarEnTabsExistentes,
  inyectarContentScript,
  leerAjustesEqualizador,
  sincronizarEqualizadorEnPestanas,
} from '@/infrastructure';
import { gestionarDescargaCancion } from '@/features/descarga';
import { esUrlSoundCloud } from '@/entities/reproductor';
import { crearLogger } from '@/shared';

const log = crearLogger('background');

type RespuestaBackground =
  | AjustesEqualizador
  | RespuestaPopup
  | RespuestaDescarga
  | RespuestaEqualizador;

export default defineBackground(() => {
  log.info('arrancado');
  void inyectarEnTabsExistentes();

  browser.tabs.onUpdated.addListener((tabId, info, pestana) => {
    if (info.status !== 'complete' || !esUrlSoundCloud(pestana.url)) return;
    void inyectarContentScript(tabId);
  });

  browser.runtime.onInstalled.addListener(() => {
    void inyectarEnTabsExistentes();
  });

  browser.commands.onCommand.addListener((comando) => {
    if (!esComandoRapido(comando)) return;
    void ejecutarComandoRapido(comando);
  });

  browser.runtime.onMessage.addListener((mensaje, _remitente, enviarRespuesta) => {
    if (!esSolicitudBackground(mensaje)) return;

    void gestionarSolicitudBackground(mensaje)
      .then(enviarRespuesta)
      .catch((err: unknown) => {
        log.error('gestion-fallo', err, { tipo: mensaje.tipo });
        enviarRespuesta(crearRespuestaErrorBackground(mensaje));
      });
    return true;
  });
});

async function ejecutarComandoRapido(comando: ComandoRapido) {
  const accion = ACCIONES_POR_COMANDO[comando];
  const pestana = await asegurarPestanaSoundCloud({
    activar: true,
    crearSiNoExiste: true,
  });
  if (!pestana?.id) return;
  try {
    await enviarSolicitudContenido(pestana.id, {
      canal: 'soundcloud-control',
      tipo: accion,
    });
  } catch (err) {
    log.warn('comando-fallo', { comando, error: err });
  }
}

async function gestionarSolicitudBackground(
  solicitud: SolicitudBackground,
): Promise<RespuestaBackground> {
  switch (solicitud.tipo) {
    case 'obtener-configuracion-equalizador':
      return leerAjustesEqualizador();
    case 'obtener-equalizador':
      return obtenerEstadoEqualizador();
    case 'guardar-equalizador':
      return guardarEqualizadorDesdePopup(solicitud.ajustes);
    case 'obtener-estado':
      return obtenerEstadoActual();
    case 'ejecutar-accion':
      return ejecutarAccionDesdePopup(solicitud.accion);
    case 'ajustar-volumen':
      return ajustarVolumenDesdePopup(solicitud.volumen);
    case 'ajustar-velocidad':
      return ajustarVelocidadDesdePopup(solicitud.velocidad);
    case 'abrir-soundcloud':
      await asegurarPestanaSoundCloud({ activar: true, crearSiNoExiste: true });
      return crearRespuestaPopup(
        'cargando',
        null,
        'SoundCloud se está abriendo en una pestaña activa.',
      );
    case 'abrir-enlace':
      await abrirEnlaceEnPestanaObjetivo(solicitud.url);
      return crearRespuestaPopup(
        'cargando',
        null,
        'Se está abriendo la vista solicitada en SoundCloud.',
      );
    case 'descargar-cancion':
      return gestionarDescargaCancion(solicitud.urlCancion);
    default:
      return crearRespuestaPopup(
        'error',
        null,
        'La acción solicitada no está soportada por la extensión.',
      );
  }
}

async function obtenerEstadoActual(): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });
  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'No hay ninguna pestaña de SoundCloud abierta.',
    );
  }
  try {
    const cancion = await enviarSolicitudContenido<EstadoCancion | null>(pestana.id, {
      canal: 'soundcloud-control',
      tipo: 'obtener-estado',
    });
    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'La pestaña está abierta, pero el reproductor todavía no está disponible.',
      );
    }
    return crearRespuestaPopup('disponible', cancion, 'Control listo.');
  } catch (err) {
    log.error('obtener-estado-fallo', err, { tabId: pestana.id, status: pestana.status });
    return crearRespuestaPopup(
      pestana.status === 'complete' ? 'sin-reproductor' : 'cargando',
      null,
      pestana.status === 'complete'
        ? 'No se ha podido leer el reproductor de SoundCloud en esta pestaña.'
        : 'SoundCloud todavía se está cargando.',
    );
  }
}

async function ejecutarAccionDesdePopup(
  accion: AccionReproductor,
): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });
  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'Abre SoundCloud para poder usar los controles.',
    );
  }
  try {
    const cancion = await enviarSolicitudContenido<EstadoCancion | null>(pestana.id, {
      canal: 'soundcloud-control',
      tipo: accion,
    });
    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'El reproductor no está listo para ejecutar esa acción.',
      );
    }
    return crearRespuestaPopup('disponible', cancion, 'Control actualizado.');
  } catch {
    return crearRespuestaPopup(
      'error',
      null,
      'No se ha podido enviar la acción al reproductor de SoundCloud.',
    );
  }
}

async function ajustarVolumenDesdePopup(volumen: number): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });
  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'Abre SoundCloud para poder ajustar el volumen.',
    );
  }

  // Chrome congela el world aislado en pestañas en segundo plano, lo que hace
  // que el postMessage isolated→MAIN no se procese hasta que la pestaña quede
  // activa. Aplicamos el volumen también directamente en el MAIN world desde
  // aquí (background) usando scripting.executeScript, que sí llega en background.
  const fraccion = Math.max(0, Math.min(1, volumen / 100));
  void browser.scripting.executeScript({
    target: { tabId: pestana.id },
    world: 'MAIN',
    func: (vol: number) => {
      const audios = Array.from(document.querySelectorAll<HTMLAudioElement>('audio'));
      for (const a of audios) {
        try { a.volume = vol; } catch { /* noop */ }
        try { a.muted = vol === 0; } catch { /* noop */ }
      }
      // También avisar al override del setter para que bloquee resets de SC
      window.postMessage(
        { canal: 'sc-control.volumen', tipo: 'set-volumen', volumen: vol },
        '*',
      );
    },
    args: [fraccion],
  }).catch(() => { /* best-effort */ });

  try {
    const cancion = await enviarSolicitudContenido<EstadoCancion | null>(pestana.id, {
      canal: 'soundcloud-control',
      tipo: 'ajustar-volumen',
      volumen,
    });
    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'No se ha encontrado el reproductor para cambiar el volumen.',
      );
    }
    return crearRespuestaPopup('disponible', cancion, 'Volumen actualizado.');
  } catch {
    return crearRespuestaPopup(
      'error',
      null,
      'No se ha podido ajustar el volumen de SoundCloud.',
    );
  }
}

async function ajustarVelocidadDesdePopup(velocidad: number): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });
  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'Abre SoundCloud para poder ajustar la velocidad.',
    );
  }

  // Mismo problema que el volumen: en Chrome el world aislado está suspendido
  // en background, por lo que el postMessage para velocidad puede no llegar.
  // Lo aplicamos también directamente en MAIN world desde el background.
  const vel = Math.max(0.25, Math.min(4, velocidad));
  void browser.scripting.executeScript({
    target: { tabId: pestana.id },
    world: 'MAIN',
    func: (v: number) => {
      const audios = Array.from(document.querySelectorAll<HTMLAudioElement>('audio'));
      for (const a of audios) {
        try { a.playbackRate = v; } catch { /* noop */ }
      }
      // Avisar al override del prototipo para que mantenga la velocidad objetivo
      window.postMessage(
        { canal: 'sc-control.velocidad', tipo: 'set-velocidad', velocidad: v },
        '*',
      );
    },
    args: [vel],
  }).catch(() => { /* best-effort */ });

  try {
    const cancion = await enviarSolicitudContenido<EstadoCancion | null>(pestana.id, {
      canal: 'soundcloud-control',
      tipo: 'ajustar-velocidad',
      velocidad,
    });
    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'No se ha encontrado el reproductor para cambiar la velocidad.',
      );
    }
    return crearRespuestaPopup('disponible', cancion, 'Velocidad actualizada.');
  } catch {
    return crearRespuestaPopup(
      'error',
      null,
      'No se ha podido ajustar la velocidad de reproducción.',
    );
  }
}

async function guardarEqualizadorDesdePopup(
  ajustesRecibidos: AjustesEqualizador,
): Promise<RespuestaEqualizador> {
  const ajustes = normalizarAjustesEqualizador(ajustesRecibidos);
  await guardarAjustesEqualizador(ajustes);
  await sincronizarEqualizadorEnPestanas(ajustes);
  return obtenerEstadoEqualizador(ajustes);
}

async function obtenerEstadoEqualizador(
  ajustesGuardados?: AjustesEqualizador,
): Promise<RespuestaEqualizador> {
  const ajustes = ajustesGuardados ?? (await leerAjustesEqualizador());
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });
  const estadoBase = crearEstadoEqualizador(ajustes);

  if (!pestana?.id) {
    return crearRespuestaEqualizador(
      'sin-pestana',
      estadoBase,
      'Puedes dejar el equalizador preparado. Se aplicará cuando abras SoundCloud.',
    );
  }

  try {
    const estado = await enviarSolicitudContenido<EstadoEqualizador | null>(pestana.id, {
      canal: 'soundcloud-control',
      tipo: 'obtener-equalizador',
    });

    if (!estado) {
      return crearRespuestaEqualizador(
        pestana.status === 'complete' ? 'sin-reproductor' : 'cargando',
        estadoBase,
        pestana.status === 'complete'
          ? 'SoundCloud está abierto, pero el content script no devolvió un estado válido del equalizador.'
          : 'SoundCloud todavía se está cargando para preparar el equalizador.',
      );
    }

    return crearRespuestaEqualizador(
      estado.audioDetectado
        ? 'disponible'
        : pestana.status === 'complete'
          ? 'sin-reproductor'
          : 'cargando',
      estado,
      crearMensajeEqualizador(estado),
    );
  } catch (err) {
    log.error('eq-consulta-fallo', err, { tabId: pestana.id });
    return crearRespuestaEqualizador(
      pestana.status === 'complete' ? 'sin-reproductor' : 'cargando',
      estadoBase,
      pestana.status === 'complete'
        ? 'SoundCloud está abierto, pero el audio todavía no está listo para el equalizador.'
        : 'SoundCloud todavía se está cargando para preparar el equalizador.',
    );
  }
}

function crearMensajeEqualizador(estado: EstadoEqualizador) {
  if (!estado.audioDetectado) {
    return 'La pestaña de SoundCloud está abierta, pero aún no hay audio disponible para procesar.';
  }
  if (estado.requiereInteraccion) {
    return 'El equalizador está preparado, pero el navegador requiere una interacción en la pestaña de SoundCloud.';
  }
  if (estado.procesando && estado.habilitado) {
    return 'El equalizador está actuando solo sobre el audio de SoundCloud.';
  }
  if (estado.procesando) {
    return 'El equalizador está listo en SoundCloud, pero ahora mismo está desactivado.';
  }
  return 'La configuración del equalizador está guardada y esperando el reproductor de SoundCloud.';
}

async function abrirEnlaceEnPestanaObjetivo(url: string) {
  const pestana = await asegurarPestanaSoundCloud({
    activar: true,
    crearSiNoExiste: true,
  });
  if (!pestana?.id) {
    await browser.tabs.create({ url, active: true });
    return;
  }
  await browser.tabs.update(pestana.id, { active: true, url });
}

function crearRespuestaErrorBackground(
  solicitud: SolicitudBackground,
): RespuestaBackground {
  switch (solicitud.tipo) {
    case 'obtener-configuracion-equalizador':
      return normalizarAjustesEqualizador(undefined);
    case 'obtener-equalizador':
      return crearRespuestaEqualizador(
        'error',
        undefined,
        'No se ha podido consultar el equalizador de SoundCloud.',
      );
    case 'guardar-equalizador':
      return crearRespuestaEqualizador(
        'error',
        solicitud.ajustes,
        'No se ha podido guardar el equalizador de SoundCloud.',
      );
    case 'descargar-cancion':
      return {
        tipo: 'descarga',
        exito: false,
        mensaje: 'No se ha podido completar la descarga solicitada.',
      };
    default:
      return crearRespuestaPopup(
        'error',
        null,
        'No se ha podido completar la solicitud en segundo plano.',
      );
  }
}
