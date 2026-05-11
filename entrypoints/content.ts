import {
  ACCIONES_REPRODUCTOR,
  MODOS_REPETICION,
  type AccionReproductor,
  type EstadoCancion,
  type ModoRepeticion,
} from '@/entities/reproductor';
import {
  esSolicitudContenido,
  type SolicitudContenido,
} from '@/services/mensajeria';
import { crearGestorEqualizadorContenido } from '@/services/puenteEqualizador';
import { publicarVelocidadObjetivo, publicarVolumenObjetivo } from '@/services/velocidadCliente';

let ultimoVolumenAudible = 0.6;
let ultimaVelocidadObjetivo = 1;

const gestorEqualizador = crearGestorEqualizadorContenido();

const SELECTORES = {
  audio: ['audio'],
  botonAleatorio: [
    '.playControls__shuffle .shuffleControl',
    'button.shuffleControl',
    '.shuffleControl',
  ],
  botonAnterior: ['.playControls__prev', 'button.playControls__prev'],
  botonMeGusta: [
    '.playControls__soundBadge .sc-button-like',
    '.playbackSoundBadge .sc-button-like',
  ],
  botonSeguir: [
    '.playControls__soundBadge .sc-button-follow',
    '.playbackSoundBadge .sc-button-follow',
  ],
  botonReproduccion: [
    '.playControls__play',
    'button.playControls__play',
    '.playControls button[aria-label*="Play"]',
    '.playControls button[aria-label*="Pause"]',
  ],
  botonRepeticion: [
    '.playControls__repeat .repeatControl',
    'button.repeatControl',
    '.repeatControl',
  ],
  botonVolumen: [
    '.playControls__volume .volume__button',
    '.playControls__volume .volume__speakerIcon',
    '.volume__button',
  ],
  botonSiguiente: ['.playControls__next', 'button.playControls__next'],
  enlaceArtista: [
    '.playbackSoundBadge__titleContextContainer a',
    '.playbackSoundBadge__lightLink',
  ],
  enlaceCancion: ['.playbackSoundBadge__titleLink'],
  imagenFondo: [
    '.playControls__soundBadge .image span',
    '.playbackSoundBadge__artwork span',
    '.playbackSoundBadge__avatar span',
  ],
  imagenEtiqueta: [
    '.playControls__soundBadge img',
    '.playbackSoundBadge img',
  ],
  sliderVolumen: [
    '.playControls__volume .volume__sliderWrapper',
    '.volume__sliderWrapper',
  ],
  volumenContenedor: [
    '.playControls__volume .volume',
    '.volume',
  ],
} as const;

export default defineContentScript({
  matches: ['*://soundcloud.com/*', '*://*.soundcloud.com/*'],
  runAt: 'document_end',
  main() {
    console.log('[CS] content script cargado en:', location.href);

    if ((window as any).__scControlLoaded) {
      console.log('[CS] ya cargado, ignorando registro duplicado');
      return;
    }
    (window as any).__scControlLoaded = true;

    browser.runtime.onMessage.addListener((mensaje, remitente, enviarRespuesta) => {
      console.log('[CS] mensaje recibido:', mensaje, '| remitente:', remitente);

      if (!esSolicitudContenido(mensaje)) {
        console.log('[CS] mensaje descartado (no es SolicitudContenido)');
        return;
      }

      void gestionarSolicitud(mensaje).then((resultado) => {
        console.log('[CS] resultado gestionarSolicitud:', resultado);
        enviarRespuesta(resultado);
      }).catch((err: unknown) => {
        console.error('[CS] error en gestionarSolicitud:', mensaje?.tipo, err);
        enviarRespuesta(null);
      });
      return true;
    });

    void gestorEqualizador.inicializar().catch((error: unknown) => {
      console.error('[EQ][CS] fallo inicializando equalizador:', error);
    });
  },
});

async function gestionarSolicitud(solicitud: SolicitudContenido) {
  if (solicitud.tipo === ACCIONES_REPRODUCTOR.obtenerEstado) {
    return obtenerEstadoActual();
  }

  if (solicitud.tipo === 'ajustar-volumen') {
    return ajustarVolumen(solicitud.volumen);
  }

  if (solicitud.tipo === 'ajustar-velocidad') {
    return ajustarVelocidad(solicitud.velocidad);
  }

  if (solicitud.tipo === 'obtener-equalizador') {
    return gestorEqualizador.obtenerEstado();
  }

  if (solicitud.tipo === 'aplicar-equalizador') {
    return gestorEqualizador.aplicarAjustes(solicitud.ajustes);
  }

  return ejecutarAccion(solicitud.tipo);
}

async function ejecutarAccion(accion: AccionReproductor) {
  const estadoAnterior = obtenerEstadoActual();

  switch (accion) {
    case ACCIONES_REPRODUCTOR.alternarAleatorio:
      buscarElemento<HTMLButtonElement>(SELECTORES.botonAleatorio)?.click();
      break;
    case ACCIONES_REPRODUCTOR.alternarSilencio:
      return alternarSilencio();
    case ACCIONES_REPRODUCTOR.cancionAnterior:
      buscarElemento<HTMLButtonElement>(SELECTORES.botonAnterior)?.click();
      break;
    case ACCIONES_REPRODUCTOR.alternarReproduccion:
      buscarElemento<HTMLButtonElement>(SELECTORES.botonReproduccion)?.click();
      break;
    case ACCIONES_REPRODUCTOR.siguienteCancion:
      buscarElemento<HTMLButtonElement>(SELECTORES.botonSiguiente)?.click();
      break;
    case ACCIONES_REPRODUCTOR.alternarMeGusta:
      buscarElemento<HTMLButtonElement>(SELECTORES.botonMeGusta)?.click();
      break;
    case ACCIONES_REPRODUCTOR.alternarSeguirArtista:
      buscarElemento<HTMLElement>(SELECTORES.botonSeguir)?.click();
      break;
    case ACCIONES_REPRODUCTOR.establecerRepeticionLista:
      return ajustarModoRepeticion(MODOS_REPETICION.lista);
    case ACCIONES_REPRODUCTOR.establecerRepeticionPista:
      return ajustarModoRepeticion(MODOS_REPETICION.pista);
    case ACCIONES_REPRODUCTOR.desactivarRepeticion:
      return ajustarModoRepeticion(MODOS_REPETICION.apagado);
    default:
      return obtenerEstadoActual();
  }

  await esperarCambioVisible(estadoAnterior, accion);
  return obtenerEstadoActual();
}

function obtenerEstadoActual(): EstadoCancion | null {
  const botonReproduccion = buscarElemento<HTMLButtonElement>(
    SELECTORES.botonReproduccion,
  );
  const enlaceArtista = buscarElemento<HTMLAnchorElement>(SELECTORES.enlaceArtista);
  const enlaceCancion = buscarElemento<HTMLAnchorElement>(SELECTORES.enlaceCancion);

  console.log('[CS] obtenerEstadoActual →',
    'botonReproduccion:', botonReproduccion?.className ?? 'NO ENCONTRADO',
    '| enlaceCancion:', enlaceCancion?.href ?? 'NO ENCONTRADO',
    '| enlaceArtista:', enlaceArtista?.href ?? 'NO ENCONTRADO',
  );

  if (!botonReproduccion || !enlaceCancion) {
    console.warn('[CS] reproductor no encontrado → devolviendo null');
    return null;
  }

  const botonAleatorio = buscarElemento<HTMLButtonElement>(SELECTORES.botonAleatorio);
  const botonMeGusta = buscarElemento<HTMLButtonElement>(SELECTORES.botonMeGusta);
  const botonSeguir = buscarElemento<HTMLElement>(SELECTORES.botonSeguir);
  const botonRepeticion = buscarElemento<HTMLButtonElement>(SELECTORES.botonRepeticion);
  const audioPrincipal = obtenerAudioPrincipal();
  const titulo = leerTexto(enlaceCancion);
  const artista = leerTexto(enlaceArtista);
  const estadoVolumen = obtenerEstadoVolumen(audioPrincipal);
  const estadoSeguimiento = obtenerEstadoSeguimiento(botonSeguir);

  if (!titulo) {
    return null;
  }

  return {
    artista,
    titulo,
    urlArtista: enlaceArtista?.href ?? null,
    urlCancion: enlaceCancion.href ?? null,
    urlImagen: obtenerUrlImagen(),
    puedeSeguirArtista: estadoSeguimiento.puedeSeguirArtista,
    siguiendoArtista: estadoSeguimiento.siguiendoArtista,
    reproduciendo: estaReproduciendo(botonReproduccion),
    meGustaActivo: Boolean(
      botonMeGusta?.classList.contains('sc-button-selected') ||
        botonMeGusta?.getAttribute('aria-pressed') === 'true',
    ),
    aleatorioActivo: estaAleatorioActivo(botonAleatorio),
    modoRepeticion: obtenerModoRepeticion(botonRepeticion),
    volumen: estadoVolumen.volumen,
    silenciado: estadoVolumen.silenciado,
    velocidadReproduccion: obtenerVelocidadReproduccion(audioPrincipal),
  };
}

function obtenerEstadoSeguimiento(botonSeguimiento: HTMLElement | null) {
  if (!botonSeguimiento) {
    return {
      puedeSeguirArtista: false,
      siguiendoArtista: false,
    };
  }

  const estilo = window.getComputedStyle(botonSeguimiento);
  const puedeSeguirArtista =
    estilo.display !== 'none' &&
    estilo.visibility !== 'hidden';

  if (!puedeSeguirArtista) {
    return {
      puedeSeguirArtista: false,
      siguiendoArtista: false,
    };
  }

  const etiqueta = (
    botonSeguimiento.getAttribute('aria-label') ??
    botonSeguimiento.getAttribute('title') ??
    botonSeguimiento.textContent ??
    ''
  ).trim().toLowerCase();

  const siguiendoArtista =
    botonSeguimiento.getAttribute('aria-pressed') === 'true' ||
    botonSeguimiento.classList.contains('sc-button-selected') ||
    /unfollow|following|dejar de seguir|siguiendo/.test(etiqueta);

  return {
    puedeSeguirArtista: true,
    siguiendoArtista,
  };
}

async function ajustarVolumen(volumen: number) {
  const volumenNormalizado = normalizarVolumen(volumen);
  const fraccion = volumenNormalizado / 100;
  const audioPrincipal = obtenerAudioPrincipal();

  // 1. Publicar al MAIN world para que bloquee los resets internos de SC.
  //    SC almacena el volumen en su variable interna `J` (módulo webpack). Cuando
  //    _updateVolume() se dispara (nueva pista, seek, stall) aplica audio.volume = J
  //    desde la MAIN world. El override en velocidadMainWorld.ts intercepta eso y
  //    mantiene nuestro objetivo durante 6 s — suficiente para transiciones de pista.
  publicarVolumenObjetivo(fraccion);

  // 2. Aplicar directamente sobre el elemento <audio>. Esto es lo que realmente
  //    controla el sonido y funciona incluso con la pestaña en segundo plano.
  if (audioPrincipal) {
    audioPrincipal.volume = fraccion;
    audioPrincipal.muted = volumenNormalizado === 0;
    if (volumenNormalizado > 0) {
      ultimoVolumenAudible = fraccion;
    }
  }

  // 3. Sincronizar la UI nativa de SoundCloud (best-effort).
  //    Si no funciona, no importa: el audio ya suena al nivel correcto y el
  //    MAIN world evitará que SC lo resetee.
  await sincronizarUiVolumen(volumenNormalizado);

  await esperar(50);
  return obtenerEstadoActual();
}

async function ajustarVelocidad(velocidad: number) {
  const velocidadNormalizada = normalizarVelocidad(velocidad);
  const audioPrincipal = obtenerAudioPrincipal();

  ultimaVelocidadObjetivo = publicarVelocidadObjetivo(velocidadNormalizada);

  if (audioPrincipal) {
    try {
      audioPrincipal.playbackRate = ultimaVelocidadObjetivo;
    } catch {
      // Si el setter falla en este world, el MAIN world lo aplicará igualmente.
    }
  }

  // SoundCloud reescribe `audio.playbackRate` desde su propio bundle (MAIN
  // world). Desde aquí (ISOLATED) no podemos contrarrestarlo. Delegamos al
  // `velocidadMainWorld.ts` vía postMessage — ese script vive en MAIN world
  // y mantiene la velocidad fijada incluso cuando SC intenta resetearla.
  ultimaVelocidadObjetivo = publicarVelocidadObjetivo(velocidadNormalizada);
  await esperar(40);
  return obtenerEstadoActual();
}

async function alternarSilencio() {
  const botonVolumen = buscarElemento<HTMLButtonElement>(SELECTORES.botonVolumen);

  if (botonVolumen) {
    botonVolumen.click();
    await esperar(100);
    return obtenerEstadoActual();
  }

  const audioPrincipal = obtenerAudioPrincipal();

  if (!audioPrincipal) {
    await esperar(80);
    return obtenerEstadoActual();
  }

  const volumenActual = Math.round(audioPrincipal.volume * 100);

  if (audioPrincipal.muted || volumenActual === 0) {
    audioPrincipal.muted = false;

    if (volumenActual === 0) {
      audioPrincipal.volume = ultimoVolumenAudible > 0 ? ultimoVolumenAudible : 0.6;
    }
  } else {
    ultimoVolumenAudible = audioPrincipal.volume;
    audioPrincipal.muted = true;
  }

  await esperar(60);
  return obtenerEstadoActual();
}

async function ajustarModoRepeticion(objetivo: ModoRepeticion) {
  const botonRepeticion = buscarElemento<HTMLButtonElement>(SELECTORES.botonRepeticion);
  let estadoActual = obtenerEstadoActual();

  if (!botonRepeticion || !estadoActual) {
    return estadoActual;
  }

  if (estadoActual.modoRepeticion === objetivo) {
    return estadoActual;
  }

  for (let intento = 0; intento < 3; intento += 1) {
    botonRepeticion.click();
    await esperar(160);

    estadoActual = obtenerEstadoActual();

    if (!estadoActual || estadoActual.modoRepeticion === objetivo) {
      return estadoActual;
    }
  }

  return estadoActual;
}

function leerTexto(elemento: Element | null) {
  if (!elemento) {
    return '';
  }

  const texto =
    elemento.getAttribute('title') ??
    elemento.textContent ??
    '';

  return texto.trim();
}

function obtenerUrlImagen() {
  const elementoFondo = buscarElemento<HTMLElement>(SELECTORES.imagenFondo);

  if (elementoFondo) {
    const fondo =
      elementoFondo.style.backgroundImage ||
      window.getComputedStyle(elementoFondo).backgroundImage;
    const coincidencia = fondo.match(/url\((["']?)(.*?)\1\)/i);

    if (coincidencia?.[2]) {
      return coincidencia[2];
    }
  }

  const etiquetaImagen = buscarElemento<HTMLImageElement>(SELECTORES.imagenEtiqueta);
  return etiquetaImagen?.src ?? null;
}

function obtenerAudioPrincipal() {
  const audios = Array.from(document.querySelectorAll<HTMLAudioElement>('audio'));

  return (
    audios.find((audio) => !audio.paused || Boolean(audio.currentSrc || audio.src)) ??
    audios[0] ??
    null
  );
}

function obtenerVelocidadReproduccion(audioPrincipal: HTMLAudioElement | null) {
  if (audioPrincipal && Number.isFinite(audioPrincipal.playbackRate)) {
    ultimaVelocidadObjetivo = normalizarVelocidad(audioPrincipal.playbackRate);
  }

  return ultimaVelocidadObjetivo;
}

function obtenerEstadoVolumen(audioPrincipal: HTMLAudioElement | null) {
  const estadoDesdeControl = obtenerEstadoVolumenDesdeControl(audioPrincipal);
  const estadoDesdeAudio = obtenerEstadoVolumenDesdeAudio(audioPrincipal);

  if (estadoDesdeControl) {
    if (!estadoDesdeControl.silenciado && estadoDesdeControl.volumen > 0) {
      ultimoVolumenAudible = estadoDesdeControl.volumen / 100;
    }

    return estadoDesdeControl;
  }

  if (estadoDesdeAudio) {
    if (!estadoDesdeAudio.silenciado && estadoDesdeAudio.volumen > 0) {
      ultimoVolumenAudible = estadoDesdeAudio.volumen / 100;
    }

    return estadoDesdeAudio;
  }

  return {
    volumen: 100,
    silenciado: false,
  };
}

function obtenerEstadoVolumenDesdeControl(audioPrincipal: HTMLAudioElement | null) {
  const sliderVolumen = buscarElemento<HTMLElement>(SELECTORES.sliderVolumen);
  const contenedorVolumen = buscarElemento<HTMLElement>(SELECTORES.volumenContenedor);
  const botonVolumen = buscarElemento<HTMLButtonElement>(SELECTORES.botonVolumen);
  const valorAria = Number(sliderVolumen?.getAttribute('aria-valuenow'));
  const valorNivel = Number(contenedorVolumen?.getAttribute('data-level'));
  const descripcionBoton = botonVolumen ? obtenerDescripcionControl(botonVolumen) : '';
  const silenciadoPorBoton =
    descripcionBoton.includes('activar sonido') ||
    descripcionBoton.includes('quitar silencio') ||
    descripcionBoton.includes('restore sound') ||
    descripcionBoton.includes('unmute') ||
    descripcionBoton.includes('muted');

  if (Number.isFinite(valorAria)) {
    const volumen =
      valorAria <= 1
        ? normalizarVolumen(valorAria * 100)
        : normalizarVolumen(valorAria);

    return {
      volumen,
      silenciado: silenciadoPorBoton || audioPrincipal?.muted === true || volumen === 0,
    };
  }

  if (Number.isFinite(valorNivel)) {
    const volumen = normalizarVolumen(valorNivel * 10);

    return {
      volumen,
      silenciado: silenciadoPorBoton || audioPrincipal?.muted === true || volumen === 0,
    };
  }

  return null;
}

function obtenerEstadoVolumenDesdeAudio(audioPrincipal: HTMLAudioElement | null) {
  if (!audioPrincipal) {
    return null;
  }

  const volumen = normalizarVolumen(Math.round(audioPrincipal.volume * 100));

  return {
    volumen,
    silenciado: audioPrincipal.muted || volumen === 0,
  };
}

/**
 * Muta directamente el DOM del control de volumen de SoundCloud.
 * Funciona en pestañas en segundo plano porque no depende del foco ni de
 * eventos de teclado/ratón que el navegador bloquea para tabs inactivos.
 *
 * Estructura del DOM de SC:
 *   <div class="volume [muted|expanded]" data-level="0-10">
 *     <div class="volume__sliderWrapper" aria-valuenow="0-1">
 *       <div class="volume__sliderProgress" style="height: Xpx">
 *       <div class="volume__sliderHandle"   style="top: Xpx">
 */
function mutarDomVolumen(
  contenedorVolumen: HTMLElement | null,
  sliderVolumen: HTMLElement | null,
  volumen: number,
) {
  const fraccion = volumen / 100;

  if (contenedorVolumen) {
    // data-level: SoundCloud usa 0-10 para el icono del altavoz
    contenedorVolumen.setAttribute('data-level', String(Math.round(volumen / 10)));
    // Clases: "muted" cuando silenciado, "expanded" cuando hay volumen
    // ("expanded" es también el estado hover, SC lo retira solo al salir el ratón)
    contenedorVolumen.classList.remove('muted', 'expanded');
    contenedorVolumen.classList.add(volumen === 0 ? 'muted' : 'expanded');
  }

  if (sliderVolumen) {
    // aria-valuenow en escala 0-1 (aria-valuemin="0" aria-valuemax="1" en SC)
    sliderVolumen.setAttribute('aria-valuenow', String(fraccion));

    // offsetHeight funciona en tabs en segundo plano (a diferencia de
    // getBoundingClientRect que devuelve 0 para elementos no visibles)
    const altoTotal = sliderVolumen.offsetHeight || 130;
    const progress = sliderVolumen.querySelector<HTMLElement>('.volume__sliderProgress');
    const handle = sliderVolumen.querySelector<HTMLElement>('.volume__sliderHandle');

    if (progress) {
      progress.style.height = `${Math.round(fraccion * altoTotal)}px`;
    }
    if (handle) {
      handle.style.top = `${Math.round((1 - fraccion) * altoTotal)}px`;
    }
  }
}

/**
 * Sincroniza la UI nativa de SoundCloud con el volumen objetivo.
 * Ruta principal: mutación directa del DOM — siempre funciona, incluso con
 * la pestaña en segundo plano (sin foco).
 * Ruta secundaria: si el slider es visible (hover activo), también envía
 * eventos de ratón para que React de SC actualice su estado interno.
 */
async function sincronizarUiVolumen(volumen: number) {
  const sliderVolumen = buscarElemento<HTMLElement>(SELECTORES.sliderVolumen);
  const contenedorVolumen = buscarElemento<HTMLElement>(SELECTORES.volumenContenedor);
  const botonVolumen = buscarElemento<HTMLButtonElement>(SELECTORES.botonVolumen);

  if (!sliderVolumen && !botonVolumen && !contenedorVolumen) {
    return;
  }

  // Ruta principal: mutación directa — funciona en background y en primer plano.
  mutarDomVolumen(contenedorVolumen, sliderVolumen, volumen);

  // Ruta secundaria: si el slider es visible (hover activo, tab en primer plano),
  // enviar también eventos de ratón para que React de SC detecte el cambio.
  if (sliderVolumen && esControlVolumenVisible(sliderVolumen)) {
    const rectangulo = sliderVolumen.getBoundingClientRect();
    const proporcion = volumen / 100;
    const margen = Math.min(6, rectangulo.height / 10);
    const altoUtil = Math.max(1, rectangulo.height - margen * 2);
    const clientX = rectangulo.left + rectangulo.width / 2;
    const clientY = limitarNumero(
      rectangulo.bottom - margen - altoUtil * proporcion,
      rectangulo.top + margen,
      rectangulo.bottom - margen,
    );

    sliderVolumen.focus({ preventScroll: true });
    despacharSecuenciaDeslizante(sliderVolumen, clientX, clientY);
  }
}

function esControlVolumenVisible(sliderVolumen: HTMLElement | null) {
  if (!sliderVolumen) return false;
  const estilo = window.getComputedStyle(sliderVolumen);
  const rect = sliderVolumen.getBoundingClientRect();
  return (
    estilo.display !== 'none' &&
    estilo.visibility !== 'hidden' &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function despacharSecuenciaDeslizante(
  sliderVolumen: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const baseMouse: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    button: 0,
    buttons: 1,
    clientX,
    clientY,
    screenX: window.screenX + clientX,
    screenY: window.screenY + clientY,
  };

  sliderVolumen.dispatchEvent(new MouseEvent('mousemove', baseMouse));
  sliderVolumen.dispatchEvent(new MouseEvent('mousedown', baseMouse));
  document.dispatchEvent(new MouseEvent('mousemove', baseMouse));

  if (typeof PointerEvent === 'function') {
    const basePointer: PointerEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX,
      clientY,
    };

    sliderVolumen.dispatchEvent(new PointerEvent('pointerdown', basePointer));
    document.dispatchEvent(new PointerEvent('pointermove', basePointer));
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        ...basePointer,
        buttons: 0,
      }),
    );
  }

  document.dispatchEvent(
    new MouseEvent('mouseup', {
      ...baseMouse,
      buttons: 0,
    }),
  );
  sliderVolumen.dispatchEvent(
    new MouseEvent('click', {
      ...baseMouse,
      buttons: 0,
    }),
  );
}

function limitarNumero(valor: number, minimo: number, maximo: number) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function estaReproduciendo(botonReproduccion: HTMLButtonElement) {
  const aria = botonReproduccion.getAttribute('aria-label')?.toLowerCase() ?? '';

  return (
    botonReproduccion.classList.contains('playing') ||
    aria.includes('pause') ||
    aria.includes('pausa')
  );
}

function estaAleatorioActivo(botonAleatorio: HTMLButtonElement | null) {
  if (!botonAleatorio) {
    return false;
  }

  const descripcion = obtenerDescripcionControl(botonAleatorio);

  return (
    botonAleatorio.classList.contains('sc-button-selected') ||
    botonAleatorio.getAttribute('aria-pressed') === 'true' ||
    descripcion.includes('desactivar aleatorio') ||
    descripcion.includes('aleatorio activado') ||
    descripcion.includes('shuffle on') ||
    descripcion.includes('m-shuffling')
  );
}

function obtenerModoRepeticion(botonRepeticion: HTMLButtonElement | null): ModoRepeticion {
  if (!botonRepeticion) {
    return MODOS_REPETICION.apagado;
  }

  const descripcion = obtenerDescripcionControl(botonRepeticion);
  const estaActivo =
    botonRepeticion.classList.contains('sc-button-selected') ||
    botonRepeticion.getAttribute('aria-pressed') === 'true' ||
    descripcion.includes('repeat-all') ||
    descripcion.includes('repeat-one') ||
    descripcion.includes('m-one') ||
    descripcion.includes('m-all') ||
    descripcion.includes('m-repeat');

  if (descripcion.includes('repeat-one') || descripcion.includes('m-one')) {
    return MODOS_REPETICION.pista;
  }

  if (descripcion.includes('repeat-all') || descripcion.includes('m-all')) {
    return MODOS_REPETICION.lista;
  }

  if (!estaActivo) {
    return MODOS_REPETICION.apagado;
  }

  if (
    descripcion.includes('repetir pista') ||
    descripcion.includes('repeat one') ||
    descripcion.includes('pista actual')
  ) {
    return MODOS_REPETICION.pista;
  }

  return MODOS_REPETICION.lista;
}

async function esperarCambioVisible(
  estadoAnterior: EstadoCancion | null,
  accion: AccionReproductor,
) {
  const tiempoMaximo =
    accion === ACCIONES_REPRODUCTOR.cancionAnterior ||
    accion === ACCIONES_REPRODUCTOR.siguienteCancion
      ? 1_600
      : 900;
  const inicio = Date.now();

  do {
    await esperar(120);

    const estadoActual = obtenerEstadoActual();

    if (haCambiadoElEstado(estadoAnterior, estadoActual, accion)) {
      return;
    }
  } while (Date.now() - inicio < tiempoMaximo);
}

function haCambiadoElEstado(
  anterior: EstadoCancion | null,
  actual: EstadoCancion | null,
  accion: AccionReproductor,
) {
  if (!actual || !anterior) {
    return true;
  }

  switch (accion) {
    case ACCIONES_REPRODUCTOR.cancionAnterior:
    case ACCIONES_REPRODUCTOR.siguienteCancion:
      return actual.titulo !== anterior.titulo || actual.artista !== anterior.artista;
    case ACCIONES_REPRODUCTOR.alternarReproduccion:
      return actual.reproduciendo !== anterior.reproduciendo;
    case ACCIONES_REPRODUCTOR.alternarMeGusta:
      return actual.meGustaActivo !== anterior.meGustaActivo;
    case ACCIONES_REPRODUCTOR.alternarAleatorio:
      return actual.aleatorioActivo !== anterior.aleatorioActivo;
    case ACCIONES_REPRODUCTOR.establecerRepeticionLista:
      return actual.modoRepeticion === MODOS_REPETICION.lista;
    case ACCIONES_REPRODUCTOR.establecerRepeticionPista:
      return actual.modoRepeticion === MODOS_REPETICION.pista;
    case ACCIONES_REPRODUCTOR.desactivarRepeticion:
      return actual.modoRepeticion === MODOS_REPETICION.apagado;
    default:
      return true;
  }
}

function obtenerDescripcionControl(elemento: HTMLElement) {
  return [
    elemento.getAttribute('class'),
    elemento.parentElement?.getAttribute('class'),
    elemento.querySelector('svg')?.getAttribute('class'),
    elemento.getAttribute('title'),
    elemento.getAttribute('aria-label'),
    elemento.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizarVolumen(valor: number) {
  return Math.max(0, Math.min(100, Math.round(valor)));
}

function normalizarVelocidad(valor: number) {
  if (!Number.isFinite(valor)) {
    return 1;
  }

  return limitarNumero(Number(valor), 0.25, 4);
}

function buscarElemento<T extends Element>(
  selectores: readonly string[],
  raiz: ParentNode = document,
) {
  for (const selector of selectores) {
    const elemento = raiz.querySelector<T>(selector);

    if (elemento) {
      return elemento;
    }
  }

  return null;
}

function esperar(milisegundos: number) {
  return new Promise<void>((resolver) => {
    window.setTimeout(resolver, milisegundos);
  });
}
