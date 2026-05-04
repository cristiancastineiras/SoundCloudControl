import {
  ACCIONES_REPRODUCTOR,
  MODOS_REPETICION,
  esSolicitudContenido,
  type AccionReproductor,
  type EstadoCancion,
  type ModoRepeticion,
  type SolicitudContenido,
} from '../lib/contratos';
import { crearGestorEqualizadorContenido } from '../lib/equalizerContenido';

let ultimoVolumenAudible = 0.6;
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
  const botonRepeticion = buscarElemento<HTMLButtonElement>(SELECTORES.botonRepeticion);
  const audioPrincipal = obtenerAudioPrincipal();
  const titulo = leerTexto(enlaceCancion);
  const artista = leerTexto(enlaceArtista);
  const estadoVolumen = obtenerEstadoVolumen(audioPrincipal);

  if (!titulo) {
    return null;
  }

  return {
    artista,
    titulo,
    urlArtista: enlaceArtista?.href ?? null,
    urlCancion: enlaceCancion.href ?? null,
    urlImagen: obtenerUrlImagen(),
    reproduciendo: estaReproduciendo(botonReproduccion),
    meGustaActivo: Boolean(
      botonMeGusta?.classList.contains('sc-button-selected') ||
        botonMeGusta?.getAttribute('aria-pressed') === 'true',
    ),
    aleatorioActivo: estaAleatorioActivo(botonAleatorio),
    modoRepeticion: obtenerModoRepeticion(botonRepeticion),
    volumen: estadoVolumen.volumen,
    silenciado: estadoVolumen.silenciado,
  };
}

async function ajustarVolumen(volumen: number) {
  const volumenNormalizado = normalizarVolumen(volumen);

  if (!ajustarVolumenDesdeControl(volumenNormalizado)) {
    const audioPrincipal = obtenerAudioPrincipal();

    if (!audioPrincipal) {
      return obtenerEstadoActual();
    }

    audioPrincipal.volume = volumenNormalizado / 100;
    audioPrincipal.muted = volumenNormalizado === 0;
  }

  if (volumenNormalizado > 0) {
    ultimoVolumenAudible = volumenNormalizado / 100;
  }

  await esperar(120);
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

function obtenerEstadoVolumen(audioPrincipal: HTMLAudioElement | null) {
  const estadoDesdeControl = obtenerEstadoVolumenDesdeControl(audioPrincipal);

  if (estadoDesdeControl) {
    if (!estadoDesdeControl.silenciado && estadoDesdeControl.volumen > 0) {
      ultimoVolumenAudible = estadoDesdeControl.volumen / 100;
    }

    return estadoDesdeControl;
  }

  if (audioPrincipal) {
    const volumen = normalizarVolumen(Math.round(audioPrincipal.volume * 100));

    if (!audioPrincipal.muted && volumen > 0) {
      ultimoVolumenAudible = audioPrincipal.volume;
    }

    return {
      volumen,
      silenciado: audioPrincipal.muted || volumen === 0,
    };
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

function ajustarVolumenDesdeControl(volumen: number) {
  const sliderVolumen = buscarElemento<HTMLElement>(SELECTORES.sliderVolumen);

  if (!sliderVolumen) {
    return false;
  }

  const rectangulo = sliderVolumen.getBoundingClientRect();

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

    sliderVolumen.focus();
    despacharSecuenciaDeslizante(sliderVolumen, clientX, clientY);
    return true;
  }

  return ajustarVolumenConTeclado(sliderVolumen, volumen);
}

function ajustarVolumenConTeclado(sliderVolumen: HTMLElement, volumenObjetivo: number) {
  const estadoActual = obtenerEstadoVolumenDesdeControl(obtenerAudioPrincipal());

  if (!estadoActual) {
    return false;
  }

  sliderVolumen.focus();

  if (volumenObjetivo === 0 || volumenObjetivo === 100) {
    const teclaExtremo = volumenObjetivo === 0 ? 'Home' : 'End';
    despacharTecla(sliderVolumen, teclaExtremo);
    return true;
  }

  const diferencia = volumenObjetivo - estadoActual.volumen;

  if (diferencia === 0) {
    return true;
  }

  const teclaDireccion = diferencia > 0 ? 'ArrowUp' : 'ArrowDown';
  const repeticiones = Math.max(1, Math.round(Math.abs(diferencia) / 10));

  for (let indice = 0; indice < repeticiones; indice += 1) {
    despacharTecla(sliderVolumen, teclaDireccion, true);
  }

  return true;
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
