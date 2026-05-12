/**
 * Override de `HTMLMediaElement.prototype.playbackRate` y `.volume` en la
 * MAIN world.
 *
 * - Override de volumen: siempre activo (todos los navegadores).
 *   SC resetea `audio.volume` desde su código interno (_updateVolume). El
 *   setter overrideado intercepta esos resets y mantiene el objetivo durante
 *   DURACION_BLOQUEO_VOLUMEN_MS ms tras el último comando.
 *
 * - Override de velocidad: solo si opciones.velocidad = true (Firefox).
 *   SC rebobina `audio.playbackRate` a 1.0 constantemente desde su bundle
 *   en la MAIN world. El override mantiene el objetivo y lo re-aplica ante
 *   cualquier intento de reset.
 *
 * Comunicación con el content script: vía `window.postMessage` con los
 * canales dedicados `sc-control.volumen` y `sc-control.velocidad`.
 */

const CANAL_VELOCIDAD = 'sc-control.velocidad';
const CANAL_VOLUMEN = 'sc-control.volumen';
const FLAG_INSTALADO = '__scControlVelocidadInstalado';

interface SolicitudVelocidad {
  canal: typeof CANAL_VELOCIDAD;
  tipo: 'set-velocidad';
  velocidad: number;
}

interface SolicitudVolumen {
  canal: typeof CANAL_VOLUMEN;
  tipo: 'set-volumen';
  volumen: number; // fracción 0–1
}

type VentanaVelocidad = Window & {
  Audio: typeof Audio;
  webkitAudioContext?: typeof AudioContext;
};

type MediaObservada = HTMLMediaElement & {
  __scControlVelocidadRegistrada?: boolean;
};

type AudioContextPatched = AudioContext & {
  __scControlVelocidadHooked?: boolean;
};

export function instalarVelocidadMainWorld(
  opciones: { velocidad?: boolean } = {},
): void {
  const instalarVelocidad = opciones.velocidad ?? true;
  const ventana = window as unknown as VentanaVelocidad & Record<string, unknown>;

  if (ventana[FLAG_INSTALADO]) {
    return;
  }
  ventana[FLAG_INSTALADO] = true;

  // ══════════════════════════════════════════════════════════════════════════
  // Override de VOLUMEN — siempre activo (Chrome + Firefox)
  // ══════════════════════════════════════════════════════════════════════════

  let volumenObjetivo = -1;      // -1 = sin control activo
  let volumenBloqueadoHasta = 0; // timestamp ms hasta el que bloqueamos resets de SC

  const DURACION_BLOQUEO_VOLUMEN_MS = 6000; // 6 s – cubre transiciones de pista y stalls

  const descriptorVolumen = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'volume',
  );

  if (descriptorVolumen?.get && descriptorVolumen?.set) {
    const nativeVolGet = descriptorVolumen.get;
    const nativeVolSet = descriptorVolumen.set;

    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: true,
      enumerable: true,
      get(this: HTMLMediaElement) {
        return nativeVolGet.call(this);
      },
      set(this: HTMLMediaElement, valor: number) {
        // Si tenemos un bloqueo activo y SC intenta resetear a otro valor, forzamos
        // el objetivo. El bloqueo expira sólo tras DURACION_BLOQUEO_VOLUMEN_MS.
        if (
          volumenObjetivo >= 0 &&
          Date.now() < volumenBloqueadoHasta &&
          Math.abs(Number(valor) - volumenObjetivo) > 0.005
        ) {
          nativeVolSet.call(this, volumenObjetivo);
          return;
        }
        nativeVolSet.call(this, valor);
      },
    });

    // Aplica el volumen objetivo a todos los elementos de audio activos.
    // Usa querySelectorAll directamente en lugar de un Set persistente para
    // capturar también elementos creados después de instalar el override.
    function aplicarVolumenATodos() {
      if (volumenObjetivo < 0) return;
      document.querySelectorAll<HTMLMediaElement>('audio,video').forEach((m) => {
        try { nativeVolSet.call(m, volumenObjetivo); } catch { /* noop */ }
      });
    }

    window.addEventListener('message', (evento: MessageEvent) => {
      if (evento.source !== window) return;
      const data = evento.data as Partial<SolicitudVolumen> | null;
      if (!data || data.canal !== CANAL_VOLUMEN) return;
      if (data.tipo === 'set-volumen' && typeof data.volumen === 'number') {
        volumenObjetivo = Math.max(0, Math.min(1, data.volumen));
        volumenBloqueadoHasta = Date.now() + DURACION_BLOQUEO_VOLUMEN_MS;
        aplicarVolumenATodos();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Override de VELOCIDAD — solo si instalarVelocidad = true (Firefox)
  // ══════════════════════════════════════════════════════════════════════════

  if (!instalarVelocidad) return;

  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'playbackRate',
  );

  if (!descriptor || !descriptor.get || !descriptor.set) {
    console.warn('[SC-Control][velocidad] no se pudo acceder al descriptor de playbackRate');
    return;
  }

  const nativeGet = descriptor.get;
  const nativeSet = descriptor.set;
  const mediosRegistrados = new Set<HTMLMediaElement>();
  let observadorDom: MutationObserver | null = null;
  let velocidadObjetivo = 1;
  let parchesInstalados = false;

  function normalizarVelocidadObjetivo(valor: unknown) {
    const limpia = Number(valor);
    if (!Number.isFinite(limpia)) {
      return 1;
    }

    return Math.max(0.25, Math.min(4, limpia));
  }

  function aplicarPreservacionTono(mediaEl: HTMLMediaElement) {
    const medioCompatible = mediaEl as HTMLMediaElement & {
      preservesPitch?: boolean;
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };

    try {
      if ('preservesPitch' in medioCompatible) {
        medioCompatible.preservesPitch = true;
      }
    } catch {
      // noop
    }

    try {
      if ('mozPreservesPitch' in medioCompatible) {
        medioCompatible.mozPreservesPitch = true;
      }
    } catch {
      // noop
    }

    try {
      if ('webkitPreservesPitch' in medioCompatible) {
        medioCompatible.webkitPreservesPitch = true;
      }
    } catch {
      // noop
    }
  }

  function aplicarVelocidadReal(
    mediaEl: HTMLMediaElement,
    velocidad = velocidadObjetivo,
  ) {
    try {
      nativeSet.call(mediaEl, velocidad);
    } catch {
      // No bloquear el resto.
    }

    aplicarPreservacionTono(mediaEl);
  }

  function registrarMedia(
    mediaEl: HTMLMediaElement | null | undefined,
    _origen: string,
  ) {
    if (!(mediaEl instanceof HTMLMediaElement)) {
      return null;
    }

    const medio = mediaEl as MediaObservada;

    if (!medio.__scControlVelocidadRegistrada) {
      medio.__scControlVelocidadRegistrada = true;
      mediosRegistrados.add(mediaEl);

      // Escucha ratechange para re-aplicar inmediatamente si un código externo
      // (p.ej. HLS.js tras load()) resetea playbackRate fuera de nuestro setter.
      mediaEl.addEventListener('ratechange', () => {
        if (velocidadObjetivo === 1) return;
        const actual = nativeGet.call(mediaEl);
        if (Math.abs(actual - velocidadObjetivo) > 0.001) {
          aplicarVelocidadReal(mediaEl);
        }
      });
    }

    aplicarVelocidadReal(mediaEl);
    return mediaEl;
  }

  function explorarNodo(nodo: ParentNode) {
    if (!('querySelectorAll' in nodo)) {
      return;
    }

    nodo
      .querySelectorAll<HTMLMediaElement>('audio,video')
      .forEach((mediaEl) => registrarMedia(mediaEl, 'dom'));
  }

  function explorarDocumento() {
    explorarNodo(document);
  }

  function limpiarMediosDesconectados() {
    for (const mediaEl of mediosRegistrados) {
      if (mediaEl.isConnected || !mediaEl.paused || mediaEl.currentSrc || mediaEl.src) {
        continue;
      }

      mediosRegistrados.delete(mediaEl);
    }
  }

  function aplicarATodos() {
    explorarDocumento();
    limpiarMediosDesconectados();
    mediosRegistrados.forEach((mediaEl) => aplicarVelocidadReal(mediaEl));
  }

  function instalarParchesMedios() {
    if (parchesInstalados) {
      return;
    }

    parchesInstalados = true;

    const AudioOriginal = ventana.Audio;
    const crearElementoOriginal = Document.prototype.createElement;
    const playOriginal = HTMLMediaElement.prototype.play;
    const loadOriginal = HTMLMediaElement.prototype.load;

    const AudioPatched = function (...args: any[]) {
      const audio = new AudioOriginal(...args);
      return registrarMedia(audio, 'window.Audio') ?? audio;
    } as unknown as typeof Audio;

    AudioPatched.prototype = AudioOriginal.prototype;
    Object.setPrototypeOf(AudioPatched, AudioOriginal);
    ventana.Audio = AudioPatched;

    Document.prototype.createElement = function (this: Document, ...args: any[]) {
      const elemento = crearElementoOriginal.apply(this, args as [string, ElementCreationOptions?]);

      if (typeof args[0] === 'string') {
        const tagName = args[0].toLowerCase();

        if (
          (tagName === 'audio' || tagName === 'video') &&
          elemento instanceof HTMLMediaElement
        ) {
          registrarMedia(elemento, 'document.createElement');
        }
      }

      return elemento;
    } as Document['createElement'];

    HTMLMediaElement.prototype.play = function (...args: any[]) {
      registrarMedia(this, 'HTMLMediaElement.play');
      return playOriginal.apply(this, args as []);
    };

    HTMLMediaElement.prototype.load = function (...args: any[]) {
      registrarMedia(this, 'HTMLMediaElement.load');
      return loadOriginal.apply(this, args as []);
    };
  }

  function hookCreateMediaElementSource(Ctor?: typeof AudioContext) {
    if (!Ctor?.prototype) {
      return;
    }

    const proto = Ctor.prototype as AudioContextPatched;
    const original = proto.createMediaElementSource;

    if (typeof original !== 'function' || proto.__scControlVelocidadHooked) {
      return;
    }

    proto.__scControlVelocidadHooked = true;
    proto.createMediaElementSource = function (mediaEl: HTMLMediaElement) {
      registrarMedia(mediaEl, 'AudioContext.createMediaElementSource');
      return original.call(this, mediaEl);
    };
  }

  function observarDom() {
    if (observadorDom || !document.documentElement) {
      return;
    }

    observadorDom = new MutationObserver((mutaciones) => {
      let hayCambios = false;

      for (const mutacion of mutaciones) {
        if (mutacion.type !== 'childList') {
          continue;
        }

        for (const nodo of mutacion.addedNodes) {
          if (!(nodo instanceof Element)) {
            continue;
          }

          if (nodo.matches('audio,video')) {
            registrarMedia(nodo as HTMLMediaElement, 'MutationObserver');
            hayCambios = true;
          }

          explorarNodo(nodo);
          hayCambios = true;
        }
      }

      if (hayCambios) {
        aplicarATodos();
      }
    });

    observadorDom.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    configurable: true,
    enumerable: true,
    get(this: HTMLMediaElement) {
      return nativeGet.call(this);
    },
    set(this: HTMLMediaElement, valor: unknown) {
      const mediaEl = registrarMedia(this, 'playbackRate.set');

      if (!mediaEl) {
        return;
      }

      if (
        valor !== null &&
        typeof valor === 'object' &&
        (valor as { __scControl?: boolean }).__scControl === true
      ) {
        const valorNumerico = normalizarVelocidadObjetivo(
          (valor as { value: unknown }).value,
        );
        aplicarVelocidadReal(mediaEl, valorNumerico);
        return;
      }

      if (Number.isFinite(Number(valor))) {
        aplicarVelocidadReal(mediaEl);
      }
    },
  });

  window.addEventListener('message', (evento: MessageEvent) => {
    if (evento.source !== window) {
      return;
    }

    const data = evento.data as Partial<SolicitudVelocidad> | null;

    if (!data || data.canal !== CANAL_VELOCIDAD) {
      return;
    }

    if (data.tipo === 'set-velocidad' && typeof data.velocidad === 'number') {
      velocidadObjetivo = normalizarVelocidadObjetivo(data.velocidad);
      aplicarATodos();
    }
  });

  instalarParchesMedios();
  hookCreateMediaElementSource(window.AudioContext);
  hookCreateMediaElementSource(ventana.webkitAudioContext);
  explorarDocumento();
  observarDom();
  aplicarATodos();
}
