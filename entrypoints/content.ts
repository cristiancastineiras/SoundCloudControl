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
import { publicarVelocidadObjetivo } from '@/services/velocidadCliente';

let ultimoVolumenAudible = 0.6;
let ultimaVelocidadObjetivo = 1;

const TOLERANCIA_SINCRONIZACION_VOLUMEN = 6;

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
  const audioPrincipal = obtenerAudioPrincipal();
  let controlSincronizado = false;

  try {
    controlSincronizado = await ajustarVolumenDesdeControl(volumenNormalizado);
  } catch {
    controlSincronizado = false;
  }

  if (audioPrincipal) {
    const estadoTrasControl = controlSincronizado
      ? obtenerEstadoVolumen(audioPrincipal)
      : null;
    const requiereFallbackAudio =
      !estadoTrasControl ||
      Math.abs(estadoTrasControl.volumen - volumenNormalizado) >
        TOLERANCIA_SINCRONIZACION_VOLUMEN ||
      (volumenNormalizado > 0 && estadoTrasControl.silenciado);

    if (requiereFallbackAudio) {
      aplicarVolumenDirecto(audioPrincipal, volumenNormalizado);
    }
  }

  await esperar(controlSincronizado ? 90 : 60);
  return obtenerEstadoActual();
}

async function ajustarVelocidad(velocidad: number) {
  const velocidadNormalizada = normalizarVelocidad(velocidad);
  const audioPrincipal = obtenerAudioPrincipal();
  const botonVolumen = buscarElemento<HTMLButtonElement>(SELECTORES.botonVolumen);

  await forzarCicloMuteUnmuteVelocidad(audioPrincipal, botonVolumen);

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

async function forzarCicloMuteUnmuteVelocidad(
  audioPrincipal: HTMLAudioElement | null,
  botonVolumen: HTMLButtonElement | null,
) {
  if (botonVolumen) {
    botonVolumen.click();
    await esperar(18);
    botonVolumen.click();
    await esperar(18);
    return;
  }

  if (!audioPrincipal) {
    return;
  }

  const estabaSilenciado = audioPrincipal.muted;
  const volumenOriginal = audioPrincipal.volume;

  if (estabaSilenciado || volumenOriginal === 0) {
    // Si ya estaba silenciado, disparamos el ciclo sin riesgo de audio
    // audible dejando el volumen en 0 durante la breve reactivación.
    audioPrincipal.volume = 0;
    audioPrincipal.muted = false;
    await esperar(18);
    audioPrincipal.muted = true;
    audioPrincipal.volume = volumenOriginal;
    return;
  }

  audioPrincipal.muted = true;
  await esperar(18);
  audioPrincipal.muted = false;
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

  if (estadoDesdeControl && estadoDesdeAudio) {
    const estadoPreferido = hayDesincronizacionVolumen(
      estadoDesdeControl,
      estadoDesdeAudio,
    )
      ? estadoDesdeAudio
      : estadoDesdeControl;

    if (!estadoPreferido.silenciado && estadoPreferido.volumen > 0) {
      ultimoVolumenAudible = estadoPreferido.volumen / 100;
    }

    return estadoPreferido;
  }

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

function hayDesincronizacionVolumen(
  estadoControl: { volumen: number; silenciado: boolean },
  estadoAudio: { volumen: number; silenciado: boolean },
) {
  return (
    Math.abs(estadoControl.volumen - estadoAudio.volumen) >
      TOLERANCIA_SINCRONIZACION_VOLUMEN ||
    (estadoControl.silenciado !== estadoAudio.silenciado &&
      (estadoControl.volumen > 0 || estadoAudio.volumen > 0))
  );
}

function aplicarVolumenDirecto(
  audioPrincipal: HTMLAudioElement,
  volumenNormalizado: number,
) {
  // Fallback fiable: si SoundCloud no refleja su slider a tiempo, al menos
  // dejamos el audio real en el valor pedido y evitamos romper el popup.
  audioPrincipal.volume = volumenNormalizado / 100;
  audioPrincipal.muted = volumenNormalizado === 0;

  if (volumenNormalizado > 0) {
    ultimoVolumenAudible = volumenNormalizado / 100;
  }
}

async function ajustarVolumenDesdeControl(volumen: number) {
  const audioPrincipal = obtenerAudioPrincipal();
  let sliderVolumen = buscarElemento<HTMLElement>(SELECTORES.sliderVolumen);
  let botonVolumen = buscarElemento<HTMLButtonElement>(SELECTORES.botonVolumen);
  let contenedorVolumen = buscarElemento<HTMLElement>(SELECTORES.volumenContenedor);
  const estadoAntes = obtenerEstadoVolumen(audioPrincipal);
  let restaurarSonido = false;

  if (!sliderVolumen && !botonVolumen) {
    return false;
  }

  if (!esControlVolumenVisible(sliderVolumen) && volumen > 0 && botonVolumen) {
    // Forzamos primero un mute para que SoundCloud reactive su propio control
    // de volumen antes de mover el slider oculto.
    if (!estadoAntes.silenciado) {
      botonVolumen.click();
      await esperar(80);
    }

    restaurarSonido = true;
    sliderVolumen = buscarElemento<HTMLElement>(SELECTORES.sliderVolumen);
    botonVolumen = buscarElemento<HTMLButtonElement>(SELECTORES.botonVolumen);
    contenedorVolumen = buscarElemento<HTMLElement>(SELECTORES.volumenContenedor);
  }

  despertarControlVolumen(contenedorVolumen, sliderVolumen, botonVolumen);

  if (!sliderVolumen) {
    return volumen <= 0 && Boolean(botonVolumen);
  }

  const rectangulo = sliderVolumen.getBoundingClientRect();

  // Slider visible en pantalla (usuario haciendo hover en SC) → eventos de
  // ratón para precisión exacta.
  if (rectangulo.height >= 12 && rectangulo.width >= 4) {
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

    if (restaurarSonido && botonVolumen) {
      await restaurarSonidoTrasAjuste(botonVolumen, volumen, audioPrincipal);
    }

    return true;
  }

  // Slider oculto (SoundCloud muestra el control solo al hacer hover con el
  // ratón físico). Usamos el atajo global Shift+ArrowUp/Down que SoundCloud
  // procesa a nivel de documento y SÍ actualiza el aria-valuenow del slider.
  // Cada pulsación equivale a un paso del 10 % del rango 0-100.
  //
  // Inspiración: IDEAS/competencia/src/contents/utils.js → volumeUp/Down()
  const estadoActual = obtenerEstadoVolumen(audioPrincipal);
  const volumenActual = estadoActual.volumen;
  const diferencia = volumen - volumenActual;

  if (diferencia === 0) {
    if (restaurarSonido && botonVolumen) {
      await restaurarSonidoTrasAjuste(botonVolumen, volumen, audioPrincipal);
    }

    return true;
  }

  // Extremos: Home/End sobre el elemento del slider son más fiables.
  if (volumen <= 0) {
    sliderVolumen.focus({ preventScroll: true });
    despacharTecla(sliderVolumen, 'Home');
    return true;
  }

  if (volumen >= 100) {
    sliderVolumen.focus({ preventScroll: true });
    despacharTecla(sliderVolumen, 'End');
    return true;
  }

  // Atajo global Shift+Arrow para valores intermedios.
  const tecla = diferencia > 0 ? 'ArrowUp' : 'ArrowDown';
  const pasos = Math.max(1, Math.round(Math.abs(diferencia) / 10));

  document.body.focus();

  for (let i = 0; i < pasos; i++) {
    const opts: KeyboardEventInit = {
      key: tecla,
      code: tecla,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    document.dispatchEvent(new KeyboardEvent('keydown', opts));
    document.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  if (restaurarSonido && botonVolumen) {
    await restaurarSonidoTrasAjuste(botonVolumen, volumen, audioPrincipal);
  }

  return true;
}

async function restaurarSonidoTrasAjuste(
  botonVolumen: HTMLButtonElement,
  volumenObjetivo: number,
  audioPrincipal: HTMLAudioElement | null,
) {
  if (volumenObjetivo <= 0) {
    return;
  }

  await esperar(40);

  if (obtenerEstadoVolumen(audioPrincipal).silenciado) {
    botonVolumen.click();
    await esperar(60);
  }
}

function despertarControlVolumen(
  ...objetivos: Array<HTMLElement | null | undefined>
) {
  for (const objetivo of objetivos) {
    if (!objetivo) {
      continue;
    }

    const rectangulo = objetivo.getBoundingClientRect();
    const clientX = rectangulo.left + rectangulo.width / 2;
    const clientY = rectangulo.top + rectangulo.height / 2;
    const eventoBase: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY,
    };

    objetivo.dispatchEvent(new MouseEvent('mouseenter', eventoBase));
    objetivo.dispatchEvent(new MouseEvent('mouseover', eventoBase));
    objetivo.dispatchEvent(new MouseEvent('mousemove', eventoBase));
  }
}

async function asegurarControlVolumenVisible() {
  // DEPRECATED — mantenida por si hay un referencia pendiente pero ya no se
  // invoca desde ajustarVolumenDesdeControl.
  return buscarElemento<HTMLElement>(SELECTORES.sliderVolumen);
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

function ajustarVolumenConTeclado(_sliderVolumen: HTMLElement, _volumenObjetivo: number) {
  // DEPRECATED — reemplazado por lógica inline en ajustarVolumenDesdeControl.
  return false;
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

function despacharTecla(elemento: HTMLElement, tecla: string, conMayusculas = false) {
  const evento: KeyboardEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: tecla,
    code: tecla,
    shiftKey: conMayusculas,
  };

  elemento.dispatchEvent(new KeyboardEvent('keydown', evento));
  elemento.dispatchEvent(new KeyboardEvent('keyup', evento));
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
