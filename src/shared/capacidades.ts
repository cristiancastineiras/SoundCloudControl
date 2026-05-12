/**
 * Capacidades habilitadas por navegador.
 *
 * `import.meta.env.BROWSER` es un literal inyectado por WXT/Vite durante la
 * compilación y se evalúa en tiempo de build: el tree-shaker elimina todo el
 * código de las ramas deshabilitadas, por lo que las features excluidas no
 * llegan al bundle final.
 *
 * Tabla de capacidades:
 *
 * | Capacidad          | Firefox | Chrome / Chromium |
 * |--------------------|---------|-------------------|
 * | Equalizador        |    ✓    |         ✗         |
 * | Control velocidad  |    ✓    |         ✗         |
 * | Control volumen    |    ✓    |         ✓         |
 *
 * Razones para deshabilitarlas en Chrome:
 * - El equalizador requiere AudioContext en MAIN world, que Chrome bloquea
 *   por políticas de CSP en algunas páginas y tiene comportamiento distinto
 *   en service workers MV3.
 * - El control de velocidad no funciona de forma fiable en Chrome porque
 *   el world aislado es suspendido en pestañas en background, y el override
 *   de playbackRate en MAIN world tiene fricción con HLS.js.
 *
 * Para añadir un navegador nuevo, agregar su identificador a la condición
 * correspondiente. WXT usa los mismos nombres que Chromium webext-polyfill:
 * 'chrome', 'firefox', 'safari', 'edge', 'opera', etc.
 */

const NAVEGADOR = import.meta.env.BROWSER as string;

export const CAPACIDADES = {
  /** Equalizador de audio de 10 bandas. Solo Firefox. */
  equalizador: NAVEGADOR === 'firefox',

  /** Control de velocidad de reproducción. Solo Firefox. */
  controlVelocidad: NAVEGADOR === 'firefox',
} as const;

export type Capacidades = typeof CAPACIDADES;
