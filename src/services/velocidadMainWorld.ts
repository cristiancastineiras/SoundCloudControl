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
const FLAG_INSTALADO = '__scControlVelocidadInstalado';

interface SolicitudVelocidad {
  canal: typeof CANAL_VELOCIDAD;
  tipo: 'set-velocidad';
  velocidad: number;
}

export function instalarVelocidadMainWorld(): void {
  if ((window as unknown as Record<string, unknown>)[FLAG_INSTALADO]) {
    return;
  }
  (window as unknown as Record<string, unknown>)[FLAG_INSTALADO] = true;

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

  let velocidadObjetivo = 1;

  // Re-define el setter de prototipo. Cualquier set externo (SoundCloud) lo
  // forzamos a nuestra `velocidadObjetivo`. Para que nuestro propio código
  // (este módulo) pueda escribir el valor real, usamos una "etiqueta" especial.
  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    configurable: true,
    enumerable: true,
    get(this: HTMLMediaElement) {
      return nativeGet.call(this);
    },
    set(this: HTMLMediaElement, valor: unknown) {
      if (
        valor !== null &&
        typeof valor === 'object' &&
        (valor as { __scControl?: boolean }).__scControl === true
      ) {
        const valorNumerico = Number((valor as { value: unknown }).value);
        if (Number.isFinite(valorNumerico)) {
          nativeSet.call(this, valorNumerico);
        }
        return;
      }

      // Fuente externa (SoundCloud reasignando la velocidad a 1). Ignoramos su
      // intento y forzamos nuestra velocidad objetivo.
      nativeSet.call(this, velocidadObjetivo);
    },
  });

  function aplicarATodos() {
    const elementos = document.querySelectorAll<HTMLMediaElement>('audio,video');
    elementos.forEach((el) => {
      try {
        nativeSet.call(el, velocidadObjetivo);
      } catch {
        // No bloquear el resto.
      }
      try {
        if ('preservesPitch' in el) {
          (el as HTMLMediaElement & { preservesPitch: boolean }).preservesPitch = true;
        }
      } catch {
        // Algunas versiones de browsers no lo permiten directamente.
      }
    });
  }

  // Inyectar tracking en createMediaElementSource para reaplicar a elementos
  // creados después de la instalación.
  const ContextoAudio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (ContextoAudio?.prototype) {
    const proto = ContextoAudio.prototype as AudioContext;
    const original = proto.createMediaElementSource;
    if (typeof original === 'function' && !(proto as unknown as { __scHooked?: boolean }).__scHooked) {
      (proto as unknown as { __scHooked: boolean }).__scHooked = true;
      proto.createMediaElementSource = function (mediaEl: HTMLMediaElement) {
        try {
          if (mediaEl && (mediaEl.tagName === 'AUDIO' || mediaEl.tagName === 'VIDEO')) {
            nativeSet.call(mediaEl, velocidadObjetivo);
            if ('preservesPitch' in mediaEl) {
              (mediaEl as HTMLMediaElement & { preservesPitch: boolean }).preservesPitch = true;
            }
          }
        } catch {
          /* noop */
        }
        return original.call(this, mediaEl);
      };
    }
  }

  // Escuchar mensajes desde el content script.
  window.addEventListener('message', (evento: MessageEvent) => {
    if (evento.source !== window) return;
    const data = evento.data as Partial<SolicitudVelocidad> | null;
    if (!data || data.canal !== CANAL_VELOCIDAD) return;

    if (data.tipo === 'set-velocidad' && typeof data.velocidad === 'number') {
      const limpia = Number(data.velocidad);
      if (!Number.isFinite(limpia)) return;
      velocidadObjetivo = Math.max(0.25, Math.min(4, limpia));
      aplicarATodos();
    }
  });

  // Aplicar de entrada por si SoundCloud ya creó elementos antes de cargarnos.
  aplicarATodos();

  // Reaplicar periódicamente durante los primeros minutos por si aparecen
  // nuevos `<audio>` mientras navegamos. Intervalo barato.
  let pasadas = 0;
  const tarea = window.setInterval(() => {
    aplicarATodos();
    pasadas += 1;
    if (pasadas > 120) {
      window.clearInterval(tarea);
    }
  }, 2000);
}
