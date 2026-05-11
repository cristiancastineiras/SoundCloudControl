/**
 * Override de `HTMLMediaElement.prototype.playbackRate` que vive en la MAIN
 * world. SoundCloud rebobina la velocidad a 1.0 constantemente desde su propio
 * código (que también vive en la MAIN world); desde el content script aislado
 * sería imposible mantener la velocidad fijada. Por eso este módulo se inyecta
 * vía `equalizer-main.ts` (ya configurado como `world: 'MAIN'`).
 *
 * Inspiración: IDEAS/speedcontrol/soundcloud-script.js (mismo patrón).
 *
 * Comunicación con el content script: vía `window.postMessage` con el canal
 * dedicado `sc-control.velocidad`. El content script publica
 * `{ tipo: 'set-velocidad', velocidad: number }` y el override actualiza el
 * objetivo y lo aplica a todos los elementos `<audio>`/`<video>`.
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

export function instalarVelocidadMainWorld(): void {
  const ventana = window as unknown as VentanaVelocidad & Record<string, unknown>;

  if (ventana[FLAG_INSTALADO]) {
    return;
  }
  ventana[FLAG_INSTALADO] = true;

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

  // ── Control de volumen (mismo patrón que playbackRate) ──────────────────────
  // SC almacena el volumen global en su variable interna `J`. Cuando _updateVolume()
  // se dispara (nueva pista, seek, stall) llama player.setVolume(J) → audio.volume = J,
  // sobreescribiendo el valor que puso nuestra extensión. La solución: override del
  // setter en MAIN world, igual que hacemos con playbackRate.
  let volumenObjetivo = -1;        // -1 = sin control activo
  let volumenBloqueadoHasta = 0;   // timestamp ms hasta el que bloqueamos los resets de SC

  const DURACION_BLOQUEO_VOLUMEN_MS = 6000; // 6 s – suficiente para transiciones de pista

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

  // ── Override del setter de `volume` ─────────────────────────────────────────
  // SC guarda el volumen global en `J` (su módulo webpack). Cuando algo dispara
  // _updateVolume() (seek, stall, nueva pista) aplica audio.volume = J desde la
  // MAIN world. Desde el content script aislado no podemos evitarlo. Hacemos lo
  // mismo que con playbackRate: interceptar el setter aquí en la MAIN world y
  // mantener el volumen objetivo durante un período tras el comando de la extensión.

  const descriptorVolumen = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'volume',
  );

  if (descriptorVolumen?.get && descriptorVolumen?.set) {
    const nativeVolGet = descriptorVolumen.get;
    const nativeVolSet = descriptorVolumen.set;

    function aplicarVolumenReal(mediaEl: HTMLMediaElement, vol = volumenObjetivo) {
      if (vol < 0) return;
      try {
        nativeVolSet.call(mediaEl, vol);
      } catch {
        // noop
      }
    }

    function aplicarVolumenATodos() {
      if (volumenObjetivo < 0) return;
      explorarDocumento();
      mediosRegistrados.forEach((m) => aplicarVolumenReal(m));
    }

    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      configurable: true,
      enumerable: true,
      get(this: HTMLMediaElement) {
        return nativeVolGet.call(this);
      },
      set(this: HTMLMediaElement, valor: number) {
        // Si la extensión tiene un bloqueo activo y SC intenta resetear a un valor
        // diferente, forzamos el objetivo. El bloqueo expira tras DURACION_BLOQUEO_VOLUMEN_MS
        // desde el último comando, lo que cubre transiciones de pista y stalls.
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

    window.addEventListener('message', (evento: MessageEvent) => {
      if (evento.source !== window) return;

      const data = evento.data as Partial<SolicitudVolumen> | null;

      if (!data || data.canal !== CANAL_VOLUMEN) return;

      if (data.tipo === 'set-volumen' && typeof data.volumen === 'number') {
        const vol = Math.max(0, Math.min(1, data.volumen));
        volumenObjetivo = vol;
        volumenBloqueadoHasta = Date.now() + DURACION_BLOQUEO_VOLUMEN_MS;
        aplicarVolumenATodos();
      }
    });
  }

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
