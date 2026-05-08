/**
 * Contratos de mensajería tipados para los tres procesos (popup, background,
 * content script). Esta es la única superficie de cambio cuando se añade un
 * nuevo tipo de mensaje runtime.
 *
 * Reglas:
 *   - `canal` siempre 'soundcloud-control' (filtro defensivo: la extensión
 *     comparte runtime con cualquier otra que escuche).
 *   - Cada `tipo` es discriminante. TS fuerza exhaustividad en switch.
 *   - Toda solicitud que cruce process boundary debe pasar por el type guard
 *     correspondiente (no confiar en remitente).
 */

import type { AjustesEqualizador, EstadoEqualizador } from '@/entities/equalizador';
import { crearEstadoEqualizador } from '@/entities/equalizador';
import type {
  AccionReproductor,
  EstadoCancion,
  EstadoVista,
} from '@/entities/reproductor';
import { ACCIONES_REPRODUCTOR } from '@/entities/reproductor';

// ---- Respuestas ------------------------------------------------------------

export interface RespuestaPopup {
  estadoVista: EstadoVista;
  cancion: EstadoCancion | null;
  mensaje: string;
}

export interface RespuestaEqualizador {
  tipo: 'equalizador';
  estadoVista: EstadoVista;
  equalizador: EstadoEqualizador;
  mensaje: string;
}

export interface RespuestaDescarga {
  tipo: 'descarga';
  exito: boolean;
  mensaje: string;
}

// ---- Solicitudes que el popup envía al background -------------------------

export type SolicitudPopup =
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'obtener-estado' }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'ejecutar-accion'; accion: AccionReproductor }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'abrir-soundcloud' }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'abrir-enlace'; url: string }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'ajustar-volumen'; volumen: number }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'ajustar-velocidad'; velocidad: number }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'descargar-cancion'; urlCancion: string }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'obtener-equalizador' }
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'guardar-equalizador'; ajustes: AjustesEqualizador };

// El background acepta todo lo del popup + un mensaje extra que solo el
// content script (al inicializar el equalizador) le manda.
export type SolicitudBackground =
  | SolicitudPopup
  | { canal: 'soundcloud-control'; destino: 'background'; tipo: 'obtener-configuracion-equalizador' };

// ---- Solicitudes que el background envía al content script ---------------

export type SolicitudContenido =
  | { canal: 'soundcloud-control'; tipo: typeof ACCIONES_REPRODUCTOR.obtenerEstado }
  | { canal: 'soundcloud-control'; tipo: AccionReproductor }
  | { canal: 'soundcloud-control'; tipo: 'ajustar-volumen'; volumen: number }
  | { canal: 'soundcloud-control'; tipo: 'ajustar-velocidad'; velocidad: number }
  | { canal: 'soundcloud-control'; tipo: 'obtener-equalizador' }
  | { canal: 'soundcloud-control'; tipo: 'aplicar-equalizador'; ajustes: AjustesEqualizador };

// ---- Type guards ----------------------------------------------------------

export function esSolicitudPopup(valor: unknown): valor is SolicitudPopup {
  if (!valor || typeof valor !== 'object') return false;
  const m = valor as Partial<SolicitudPopup>;

  if (m.tipo === 'ajustar-volumen') {
    return (
      m.canal === 'soundcloud-control' &&
      m.destino === 'background' &&
      typeof m.volumen === 'number'
    );
  }
  if (m.tipo === 'ajustar-velocidad') {
    return (
      m.canal === 'soundcloud-control' &&
      m.destino === 'background' &&
      typeof (m as any).velocidad === 'number'
    );
  }
  if (m.tipo === 'guardar-equalizador') {
    return (
      m.canal === 'soundcloud-control' &&
      m.destino === 'background' &&
      Boolean(m.ajustes) &&
      typeof m.ajustes === 'object'
    );
  }
  return (
    m.canal === 'soundcloud-control' &&
    m.destino === 'background' &&
    typeof m.tipo === 'string'
  );
}

export function esSolicitudBackground(valor: unknown): valor is SolicitudBackground {
  if (!valor || typeof valor !== 'object') return false;
  const m = valor as Partial<SolicitudBackground>;
  if (m.tipo === 'obtener-configuracion-equalizador') {
    return m.canal === 'soundcloud-control' && m.destino === 'background';
  }
  return esSolicitudPopup(valor);
}

export function esSolicitudContenido(valor: unknown): valor is SolicitudContenido {
  if (!valor || typeof valor !== 'object') return false;
  const m = valor as Partial<SolicitudContenido>;

  if (m.tipo === 'ajustar-volumen') {
    return m.canal === 'soundcloud-control' && typeof m.volumen === 'number';
  }
  if (m.tipo === 'ajustar-velocidad') {
    return m.canal === 'soundcloud-control' && typeof (m as any).velocidad === 'number';
  }
  if (m.tipo === 'aplicar-equalizador') {
    return (
      m.canal === 'soundcloud-control' &&
      Boolean(m.ajustes) &&
      typeof m.ajustes === 'object'
    );
  }
  return m.canal === 'soundcloud-control' && typeof m.tipo === 'string';
}

// ---- Factories ------------------------------------------------------------

export function crearRespuestaPopup(
  estadoVista: EstadoVista,
  cancion: EstadoCancion | null,
  mensaje: string,
): RespuestaPopup {
  return { estadoVista, cancion, mensaje };
}

export function crearRespuestaEqualizador(
  estadoVista: EstadoVista,
  equalizador: Partial<EstadoEqualizador> | AjustesEqualizador | undefined,
  mensaje: string,
): RespuestaEqualizador {
  return {
    tipo: 'equalizador',
    estadoVista,
    equalizador: crearEstadoEqualizador(equalizador),
    mensaje,
  };
}
