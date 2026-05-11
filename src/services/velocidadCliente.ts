/**
 * Cliente del content script (ISOLATED) que envía actualizaciones de velocidad
 * al script de la MAIN world (instalado por `equalizer-main.ts`).
 *
 * SoundCloud reescribe `audio.playbackRate` desde su propio código en la MAIN
 * world; setearlo desde el content aislado funciona durante un instante y
 * vuelve a 1 al siguiente tick. Por eso delegamos en `velocidadMainWorld.ts`
 * a través de `window.postMessage`.
 */

const CANAL_VELOCIDAD = 'sc-control.velocidad';
const CANAL_VOLUMEN = 'sc-control.volumen';

export function publicarVelocidadObjetivo(velocidad: number): number {
  const limpia = Number(velocidad);
  if (!Number.isFinite(limpia)) return 1;
  const clamp = Math.max(0.25, Math.min(4, limpia));

  try {
    window.postMessage(
      {
        canal: CANAL_VELOCIDAD,
        tipo: 'set-velocidad',
        velocidad: clamp,
      },
      '*',
    );
  } catch {
    // No bloquear si el postMessage falla.
  }

  return clamp;
}

/**
 * Publica el volumen objetivo al script de la MAIN world para que bloquee
 * los resets internos de SC (_updateVolume → player.setVolume(J)).
 * Mismo patrón que publicarVelocidadObjetivo.
 *
 * @param volumen - fracción 0–1
 */
export function publicarVolumenObjetivo(volumen: number): number {
  const limpia = Number(volumen);
  if (!Number.isFinite(limpia)) return 1;
  const clamp = Math.max(0, Math.min(1, limpia));

  try {
    window.postMessage(
      {
        canal: CANAL_VOLUMEN,
        tipo: 'set-volumen',
        volumen: clamp,
      },
      '*',
    );
  } catch {
    // No bloquear si el postMessage falla.
  }

  return clamp;
}
