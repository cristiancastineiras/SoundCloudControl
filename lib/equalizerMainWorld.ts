import {
  BANDAS_EQUALIZADOR,
  crearEstadoEqualizador,
  normalizarAjustesEqualizador,
  type AjustesEqualizador,
  type EstadoContextoEqualizador,
  type EstadoEqualizador,
  type IdBandaEqualizador,
} from './equalizer';
import {
  CANAL_LISTO_EQUALIZADOR,
  CANAL_RESPUESTA_EQUALIZADOR,
  esSolicitudPuenteEqualizador,
  type RespuestaPuenteEqualizador,
} from './equalizerBridge';

const PREFIJO_LOG_EQ = '[EQ][PAGE]';
const MARCADOR_GLOBAL = '__scEqMainLoaded';

type VentanaEqualizador = Window & {
  __scEqMainLoaded?: boolean;
};

type AudioObservado = HTMLAudioElement & {
  __scEqEscuchado?: boolean;
};

export function instalarEqualizadorMainWorld() {
  const ventanaEqualizador = window as unknown as VentanaEqualizador;

  if (ventanaEqualizador[MARCADOR_GLOBAL]) {
    anunciarBridgeListo();
    return;
  }

  ventanaEqualizador[MARCADOR_GLOBAL] = true;

  let ajustes = normalizarAjustesEqualizador(undefined);
  let inicializacion: Promise<void> | null = null;
  let observandoPagina = false;
  let audioDetectado: HTMLAudioElement | null = null;
  let contexto: AudioContext | null = null;
  let fuenteActiva: MediaElementAudioSourceNode | null = null;
  let audioConectado: HTMLAudioElement | null = null;
  let preampNode: GainNode | null = null;
  let filtros: Map<IdBandaEqualizador, BiquadFilterNode> = new Map();
  let fuentesPorAudio = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
  let observadorDom: MutationObserver | null = null;
  let temporizadorSincronizacion: number | null = null;
  let ultimoError: string | null = null;
  let ultimaFirmaEstado = '';
  let ultimoAudioActivo: HTMLAudioElement | null = null;
  let audiosRegistrados = new Set<HTMLAudioElement>();
  let actividadPorAudio = new Map<HTMLAudioElement, number>();
  let parchesInstalados = false;

  function contarFiltrosActivos(origen = ajustes) {
    return BANDAS_EQUALIZADOR.reduce((total, { id }) => {
      return total + (origen.habilitado && origen.bandas[id] !== 0 ? 1 : 0);
    }, 0);
  }

  function resumirUrl(url: string | null | undefined) {
    if (!url) {
      return null;
    }

    try {
      const valor = new URL(url);
      return `${valor.hostname}${valor.pathname}`;
    } catch {
      return url.slice(0, 120);
    }
  }

  function resumirAudio(audio: HTMLAudioElement | null) {
    if (!audio) {
      return null;
    }

    return {
      src: resumirUrl(audio.currentSrc || audio.src || null),
      paused: audio.paused,
      ended: audio.ended,
      muted: audio.muted,
      volume: Number(audio.volume.toFixed(2)),
      currentTime: Number(audio.currentTime.toFixed(2)),
      readyState: audio.readyState,
      networkState: audio.networkState,
      isConnected: audio.isConnected,
    };
  }

  function resumirAjustes(origen: AjustesEqualizador) {
    return {
      habilitado: origen.habilitado,
      presetId: origen.presetId,
      preamp: origen.preamp,
      filtrosActivos: contarFiltrosActivos(origen),
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

  function warnEq(evento: string, detalles?: unknown) {
    if (detalles === undefined) {
      console.warn(PREFIJO_LOG_EQ, evento);
      return;
    }

    console.warn(PREFIJO_LOG_EQ, evento, detalles);
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

  function registrarEstado(motivo: string) {
    const snapshot = {
      motivo,
      ajustes: resumirAjustes(ajustes),
      audioDetectado: resumirAudio(audioDetectado),
      audioConectado: resumirAudio(audioConectado),
      audiosRegistrados: audiosRegistrados.size,
      contexto: contexto?.state ?? 'unavailable',
      fuenteActiva: Boolean(fuenteActiva),
      ultimoError,
    };
    const firma = JSON.stringify(snapshot);

    if (firma === ultimaFirmaEstado) {
      return;
    }

    ultimaFirmaEstado = firma;
    logEq('estado', snapshot);
  }

  function anunciarBridgeListo() {
    window.postMessage({ canal: CANAL_LISTO_EQUALIZADOR }, '*');
  }

  function responder(respuesta: RespuestaPuenteEqualizador) {
    window.postMessage(respuesta, '*');
  }

  function marcarActividadAudio(audio: HTMLAudioElement, motivo: string) {
    actividadPorAudio.set(audio, Date.now());
    ultimoAudioActivo = audio;
    logEq('audio-actividad', {
      motivo,
      audio: resumirAudio(audio),
    });
  }

  function instalarEscuchasAudio(audio: HTMLAudioElement) {
    const audioObservado = audio as unknown as AudioObservado;

    if (audioObservado.__scEqEscuchado) {
      return;
    }

    audioObservado.__scEqEscuchado = true;

    for (const tipoEvento of [
      'play',
      'playing',
      'pause',
      'emptied',
      'ended',
      'loadstart',
      'loadedmetadata',
      'canplay',
      'volumechange',
    ]) {
      audio.addEventListener(tipoEvento, () => {
        registrarAudio(audio, `evento:${tipoEvento}`);

        if (
          tipoEvento === 'play' ||
          tipoEvento === 'playing' ||
          tipoEvento === 'loadstart' ||
          tipoEvento === 'loadedmetadata' ||
          tipoEvento === 'canplay'
        ) {
          marcarActividadAudio(audio, `evento:${tipoEvento}`);
        }

        programarSincronizacion(`audio:${tipoEvento}`, tipoEvento === 'emptied' ? 40 : 0);
      });
    }
  }

  function registrarAudio(audio: HTMLAudioElement, origen: string) {
    if (!(audio instanceof HTMLAudioElement)) {
      return audio;
    }

    const esNuevo = !audiosRegistrados.has(audio);
    audiosRegistrados.add(audio);
    actividadPorAudio.set(audio, actividadPorAudio.get(audio) ?? Date.now());
    instalarEscuchasAudio(audio);

    if (!audio.paused || audio.currentTime > 0) {
      ultimoAudioActivo = audio;
    }

    if (esNuevo) {
      logEq('audio-registrado', {
        origen,
        total: audiosRegistrados.size,
        audio: resumirAudio(audio),
      });
    }

    return audio;
  }

  function explorarAudiosDocumento() {
    const audios = Array.from(document.querySelectorAll<HTMLAudioElement>('audio'));

    for (const audio of audios) {
      registrarAudio(audio, 'document.querySelectorAll');
    }

    return audios;
  }

  function instalarParchesAudio() {
    if (parchesInstalados) {
      return;
    }

    parchesInstalados = true;

    const AudioOriginal = window.Audio;
    const crearElementoOriginal = Document.prototype.createElement;
    const playOriginal = HTMLMediaElement.prototype.play;
    const loadOriginal = HTMLMediaElement.prototype.load;

    const AudioPatched = function (...args: any[]) {
      const audio = new AudioOriginal(...args);
      return registrarAudio(audio, 'window.Audio');
    } as unknown as typeof Audio;

    AudioPatched.prototype = AudioOriginal.prototype;
    Object.setPrototypeOf(AudioPatched, AudioOriginal);
    window.Audio = AudioPatched;

    Document.prototype.createElement = function (this: Document, ...args: any[]) {
      const elemento = crearElementoOriginal.apply(this, args as [string, ElementCreationOptions?]);

      if (
        typeof args[0] === 'string' &&
        args[0].toLowerCase() === 'audio' &&
        elemento instanceof HTMLAudioElement
      ) {
        registrarAudio(elemento, 'document.createElement');
      }

      return elemento;
    } as Document['createElement'];

    HTMLMediaElement.prototype.play = function (...args: any[]) {
      if (this instanceof HTMLAudioElement) {
        registrarAudio(this, 'HTMLMediaElement.play');
        marcarActividadAudio(this, 'HTMLMediaElement.play');
        programarSincronizacion('play-invocado');
      }

      return playOriginal.apply(this, args as []);
    };

    HTMLMediaElement.prototype.load = function (...args: any[]) {
      if (this instanceof HTMLAudioElement) {
        registrarAudio(this, 'HTMLMediaElement.load');
        programarSincronizacion('load-invocado', 20);
      }

      return loadOriginal.apply(this, args as []);
    };

    logEq('parches-audio-instalados');
  }

  function puntuarAudio(audio: HTMLAudioElement) {
    let puntuacion = 0;

    if (audio === ultimoAudioActivo) {
      puntuacion += 1000;
    }

    if (!audio.paused) {
      puntuacion += 500;
    }

    if (!audio.ended) {
      puntuacion += 120;
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      puntuacion += 100;
    }

    if (audio.currentTime > 0) {
      puntuacion += 80;
    }

    if (audio.currentSrc || audio.src) {
      puntuacion += 40;
    }

    if (audio.isConnected) {
      puntuacion += 10;
    }

    puntuacion += actividadPorAudio.get(audio) ?? 0;
    return puntuacion;
  }

  function obtenerAudioObjetivo() {
    explorarAudiosDocumento();

    const candidatos = Array.from(audiosRegistrados).filter((audio) => {
      return (
        !audio.paused ||
        Boolean(audio.currentSrc || audio.src) ||
        audio.currentTime > 0 ||
        audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      );
    });

    return (
      candidatos.sort((izquierda, derecha) => {
        return puntuarAudio(derecha) - puntuarAudio(izquierda);
      })[0] ?? null
    );
  }

  function dbALineal(db: number) {
    return Math.pow(10, db / 20);
  }

  function programarSincronizacion(motivo: string, retrasoMs = 0) {
    if (temporizadorSincronizacion !== null) {
      window.clearTimeout(temporizadorSincronizacion);
    }

    temporizadorSincronizacion = window.setTimeout(() => {
      temporizadorSincronizacion = null;
      void sincronizarAudioActivo(motivo);
    }, retrasoMs);
  }

  function escucharPagina() {
    if (observandoPagina) {
      return;
    }

    observandoPagina = true;

    const alCambiarMedia = (evento: Event) => {
      if (!(evento.target instanceof HTMLAudioElement)) {
        return;
      }

      registrarAudio(evento.target, `documento:${evento.type}`);

      if (evento.type === 'play' || evento.type === 'playing') {
        marcarActividadAudio(evento.target, `documento:${evento.type}`);
      }

      programarSincronizacion(`evento-media:${evento.type}`, evento.type === 'emptied' ? 40 : 0);
    };

    const alInteractuar = () => {
      void reanudarContextoSiHaceFalta('interaccion-usuario');
      programarSincronizacion('interaccion-usuario');
    };

    for (const tipoEvento of [
      'play',
      'playing',
      'pause',
      'emptied',
      'ended',
      'loadstart',
      'loadedmetadata',
      'canplay',
    ]) {
      document.addEventListener(tipoEvento, alCambiarMedia, true);
    }

    for (const tipoEvento of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(tipoEvento, alInteractuar, true);
    }

    if (document.documentElement) {
      observadorDom = new MutationObserver((mutaciones) => {
        const cambioAudio = mutaciones.some((mutacion) => {
          if (mutacion.type !== 'childList') {
            return false;
          }

          return [...mutacion.addedNodes, ...mutacion.removedNodes].some((nodo) => {
            if (!(nodo instanceof Element)) {
              return false;
            }

            return nodo.matches('audio') || Boolean(nodo.querySelector('audio'));
          });
        });

        if (cambioAudio) {
          explorarAudiosDocumento();
          programarSincronizacion('mutacion-dom');
        }
      });
      observadorDom.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }

    logEq('observadores-registrados');
  }

  function asegurarContexto() {
    if (!contexto || contexto.state === 'closed') {
      contexto = new AudioContext();
      preampNode = null;
      filtros = new Map();
      fuenteActiva = null;
      audioConectado = null;
      fuentesPorAudio = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

      contexto.addEventListener('statechange', () => {
        logEq('contexto-statechange', { state: contexto?.state ?? 'unknown' });
        registrarEstado('contexto-statechange');
      });

      logEq('contexto-creado', { sampleRate: contexto.sampleRate, state: contexto.state });
    }

    return contexto;
  }

  function asegurarCadenaProcesado(contextoAudio: AudioContext) {
    if (preampNode && filtros.size === BANDAS_EQUALIZADOR.length) {
      return;
    }

    preampNode = contextoAudio.createGain();
    filtros = new Map();

    for (const banda of BANDAS_EQUALIZADOR) {
      const filtro = contextoAudio.createBiquadFilter();
      filtro.type = banda.tipoFiltro;
      filtro.frequency.value = banda.frecuencia;
      filtro.Q.value = banda.q;
      filtro.gain.value = 0;
      filtros.set(banda.id, filtro);
    }

    aplicarAjustesANodos('crear-cadena');
    logEq('cadena-creada', { bandas: BANDAS_EQUALIZADOR.length });
  }

  function reconectarCadenaProcesado() {
    if (!preampNode || !contexto) {
      return;
    }

    try {
      preampNode.disconnect();
    } catch {
      return;
    }

    for (const banda of BANDAS_EQUALIZADOR) {
      const filtro = filtros.get(banda.id);
      if (!filtro) {
        continue;
      }

      try {
        filtro.disconnect();
      } catch {
        continue;
      }
    }

    let nodoAnterior: AudioNode = preampNode;

    for (const banda of BANDAS_EQUALIZADOR) {
      const filtro = filtros.get(banda.id);
      const ganancia = ajustes.habilitado ? ajustes.bandas[banda.id] ?? 0 : 0;

      if (!filtro || ganancia === 0) {
        continue;
      }

      nodoAnterior.connect(filtro);
      nodoAnterior = filtro;
    }

    nodoAnterior.connect(contexto.destination);
  }

  function aplicarAjustesANodos(motivo: string) {
    if (!preampNode) {
      return;
    }

    preampNode.gain.value = dbALineal(ajustes.habilitado ? ajustes.preamp : 0);

    for (const banda of BANDAS_EQUALIZADOR) {
      const filtro = filtros.get(banda.id);

      if (!filtro) {
        continue;
      }

      filtro.gain.value = ajustes.habilitado ? ajustes.bandas[banda.id] ?? 0 : 0;
    }

    reconectarCadenaProcesado();
    registrarEstado(motivo);
  }

  function obtenerFuente(audio: HTMLAudioElement, contextoAudio: AudioContext) {
    const fuenteExistente = fuentesPorAudio.get(audio);

    if (fuenteExistente) {
      return fuenteExistente;
    }

    try {
      const fuenteNueva = contextoAudio.createMediaElementSource(audio);
      fuentesPorAudio.set(audio, fuenteNueva);
      logEq('fuente-creada', { audio: resumirAudio(audio) });
      return fuenteNueva;
    } catch (error) {
      errorEq('fuente-crear-fallo', error, { audio: resumirAudio(audio) });
      return null;
    }
  }

  function desconectarFuenteActiva(motivo: string) {
    if (!fuenteActiva) {
      return;
    }

    try {
      fuenteActiva.disconnect();
    } catch (error) {
      warnEq('fuente-desconectar-fallo', { motivo, error: normalizarError(error) });
    }

    logEq('fuente-desconectada', { motivo, audio: resumirAudio(audioConectado) });
    fuenteActiva = null;
    audioConectado = null;
  }

  function conectarAudio(audio: HTMLAudioElement, motivo: string) {
    const contextoAudio = asegurarContexto();

    if (!contextoAudio) {
      return false;
    }

    asegurarCadenaProcesado(contextoAudio);

    if (!preampNode) {
      return false;
    }

    const fuente = obtenerFuente(audio, contextoAudio);

    if (!fuente) {
      return false;
    }

    if (fuenteActiva !== fuente) {
      desconectarFuenteActiva(`${motivo}:reemplazar-fuente`);

      try {
        fuente.connect(preampNode);
      } catch (error) {
        errorEq('fuente-conectar-fallo', error, { audio: resumirAudio(audio), motivo });
        return false;
      }

      fuenteActiva = fuente;
      audioConectado = audio;
      logEq('fuente-conectada', { motivo, audio: resumirAudio(audio) });
    }

    aplicarAjustesANodos(`${motivo}:aplicar-nodos`);
    return true;
  }

  async function reanudarContextoSiHaceFalta(motivo: string) {
    if (!ajustes.habilitado || !audioDetectado || !contexto || contexto.state !== 'suspended') {
      return;
    }

    try {
      logEq('contexto-reanudar-intento', { motivo });
      await contexto.resume();
      logEq('contexto-reanudado', { motivo, state: contexto.state });
    } catch (error) {
      errorEq('contexto-reanudar-fallo', error, { motivo, audio: resumirAudio(audioDetectado) });
    }
  }

  async function sincronizarAudioActivo(motivo: string) {
    const audioActual = obtenerAudioObjetivo();
    const audioCambio = audioActual !== audioDetectado;
    audioDetectado = audioActual;

    if (audioCambio) {
      logEq(audioActual ? 'audio-detectado' : 'audio-no-detectado', {
        motivo,
        candidatos: audiosRegistrados.size,
        audio: resumirAudio(audioActual),
      });
    }

    if (!audioActual) {
      if (audioConectado && audioConectado.ended) {
        desconectarFuenteActiva(`${motivo}:audio-terminado`);
      }

      registrarEstado(motivo);
      return;
    }

    if (!ajustes.habilitado) {
      if (preampNode) {
        aplicarAjustesANodos(`${motivo}:deshabilitado`);
      } else {
        registrarEstado(motivo);
      }

      return;
    }

    if (conectarAudio(audioActual, motivo)) {
      await reanudarContextoSiHaceFalta(motivo);
    }

    registrarEstado(motivo);
  }

  async function inicializarInterno() {
    logEq('inicializando');
    instalarParchesAudio();
    explorarAudiosDocumento();
    escucharPagina();
    anunciarBridgeListo();
    await sincronizarAudioActivo('inicializar');
  }

  async function asegurarInicializado() {
    if (!inicializacion) {
      inicializacion = inicializarInterno();
    }

    await inicializacion;
  }

  function construirEstado(): EstadoEqualizador {
    return crearEstadoEqualizador({
      ...ajustes,
      audioDetectado: Boolean(audioDetectado),
      procesando: Boolean(audioConectado && fuenteActiva && preampNode && contexto?.state === 'running'),
      requiereInteraccion:
        ajustes.habilitado && Boolean(audioDetectado) && contexto?.state === 'suspended',
      estadoContexto: (contexto?.state ?? 'unavailable') as EstadoContextoEqualizador,
    });
  }

  async function manejarPing(id: string) {
    responder({
      canal: CANAL_RESPUESTA_EQUALIZADOR,
      id,
      tipo: 'ping',
      ok: true,
    });
  }

  async function manejarObtenerEstado(id: string) {
    await asegurarInicializado();
    await sincronizarAudioActivo('consultar-estado');
    responder({
      canal: CANAL_RESPUESTA_EQUALIZADOR,
      id,
      tipo: 'obtener-estado',
      ok: true,
      estado: construirEstado(),
    });
  }

  async function manejarAplicarAjustes(id: string, ajustesSiguientes: AjustesEqualizador) {
    await asegurarInicializado();

    const ajustesNormalizados = normalizarAjustesEqualizador(ajustesSiguientes);

    logEq('aplicar-ajustes', {
      anterior: resumirAjustes(ajustes),
      siguiente: resumirAjustes(ajustesNormalizados),
    });

    ajustes = ajustesNormalizados;
    ultimoError = null;

    if (ajustes.habilitado) {
      const contextoAudio = asegurarContexto();
      asegurarCadenaProcesado(contextoAudio);
      aplicarAjustesANodos('aplicar-ajustes');
    } else if (preampNode) {
      aplicarAjustesANodos('aplicar-ajustes');
    }

    await sincronizarAudioActivo('aplicar-ajustes');

    if (ajustes.habilitado) {
      await reanudarContextoSiHaceFalta('aplicar-ajustes');
    }

    responder({
      canal: CANAL_RESPUESTA_EQUALIZADOR,
      id,
      tipo: 'aplicar-ajustes',
      ok: true,
      estado: construirEstado(),
    });
  }

  function responderConError(
    id: string,
    tipo: 'ping' | 'obtener-estado' | 'aplicar-ajustes',
    error: unknown,
  ) {
    responder({
      canal: CANAL_RESPUESTA_EQUALIZADOR,
      id,
      tipo,
      ok: false,
      error: normalizarError(error),
    });
  }

  const manejarMensajesBridge = (evento: MessageEvent) => {
    if (evento.source !== window || !esSolicitudPuenteEqualizador(evento.data)) {
      return;
    }

    const solicitud = evento.data;

    if (solicitud.tipo === 'ping') {
      void manejarPing(solicitud.id).catch((error) => {
        responderConError(solicitud.id, solicitud.tipo, error);
      });
      return;
    }

    if (solicitud.tipo === 'obtener-estado') {
      void manejarObtenerEstado(solicitud.id).catch((error) => {
        responderConError(solicitud.id, solicitud.tipo, error);
      });
      return;
    }

    void manejarAplicarAjustes(solicitud.id, solicitud.ajustes).catch((error) => {
      responderConError(solicitud.id, solicitud.tipo, error);
    });
  };

  window.addEventListener('message', manejarMensajesBridge);
  anunciarBridgeListo();
  void asegurarInicializado().catch((error) => {
    errorEq('inicializacion-fallo', error);
  });
}