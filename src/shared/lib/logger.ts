/**
 * Logger centralizado para los tres contextos de la extensión (background,
 * content, popup, MAIN world).
 *
 * Convenciones:
 *   - Un logger por archivo, nombrado con el path en notación punto.
 *     Ejemplo: 'eq.contenido', 'eq.main', 'descarga.orquestador', 'background'.
 *   - Niveles: info (estado normal), warn (situación recuperable),
 *     error (fallo). El prefijo `[nombre]` se aplica automáticamente.
 *   - En builds de producción, Terser elimina las llamadas a console.* via
 *     `drop_console` (ver wxt.config.ts), por lo que estos logs sólo viven
 *     durante desarrollo y debug del soporte.
 */
export interface Logger {
  readonly nombre: string;
  info(evento: string, detalles?: unknown): void;
  warn(evento: string, detalles?: unknown): void;
  error(evento: string, error: unknown, detalles?: unknown): void;
  hijo(sufijo: string): Logger;
}

function emitir(
  metodo: 'log' | 'warn' | 'error',
  prefijo: string,
  evento: string,
  detalles: unknown,
): void {
  if (detalles === undefined) {
    console[metodo](prefijo, evento);
    return;
  }
  console[metodo](prefijo, evento, detalles);
}

export function crearLogger(nombre: string): Logger {
  const prefijo = `[${nombre}]`;
  return {
    nombre,
    info(evento, detalles) {
      emitir('log', prefijo, evento, detalles);
    },
    warn(evento, detalles) {
      emitir('warn', prefijo, evento, detalles);
    },
    error(evento, error, detalles) {
      const mensaje = formatearError(error);
      if (detalles === undefined) {
        console.error(prefijo, evento, mensaje);
        return;
      }
      console.error(prefijo, evento, mensaje, detalles);
    },
    hijo(sufijo) {
      return crearLogger(`${nombre}.${sufijo}`);
    },
  };
}

export function formatearError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
