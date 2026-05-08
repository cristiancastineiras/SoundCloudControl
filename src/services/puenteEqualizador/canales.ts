import type { AjustesEqualizador, EstadoEqualizador } from '@/entities/equalizador';

export const CANAL_SOLICITUD_EQUALIZADOR = 'soundcloud-control:eq-request';
export const CANAL_RESPUESTA_EQUALIZADOR = 'soundcloud-control:eq-response';
export const CANAL_LISTO_EQUALIZADOR = 'soundcloud-control:eq-ready';

export type TipoSolicitudPuenteEqualizador =
  | 'ping'
  | 'obtener-estado'
  | 'aplicar-ajustes';

export type SolicitudPuenteEqualizador =
  | {
      canal: typeof CANAL_SOLICITUD_EQUALIZADOR;
      id: string;
      tipo: 'ping';
    }
  | {
      canal: typeof CANAL_SOLICITUD_EQUALIZADOR;
      id: string;
      tipo: 'obtener-estado';
    }
  | {
      canal: typeof CANAL_SOLICITUD_EQUALIZADOR;
      id: string;
      tipo: 'aplicar-ajustes';
      ajustes: AjustesEqualizador;
    };

export type RespuestaPuenteEqualizador =
  | {
      canal: typeof CANAL_RESPUESTA_EQUALIZADOR;
      id: string;
      tipo: 'ping';
      ok: true;
    }
  | {
      canal: typeof CANAL_RESPUESTA_EQUALIZADOR;
      id: string;
      tipo: 'obtener-estado';
      ok: true;
      estado: EstadoEqualizador;
    }
  | {
      canal: typeof CANAL_RESPUESTA_EQUALIZADOR;
      id: string;
      tipo: 'aplicar-ajustes';
      ok: true;
      estado: EstadoEqualizador;
    }
  | {
      canal: typeof CANAL_RESPUESTA_EQUALIZADOR;
      id: string;
      tipo: TipoSolicitudPuenteEqualizador;
      ok: false;
      error: string;
    };

export interface MensajeListoEqualizador {
  canal: typeof CANAL_LISTO_EQUALIZADOR;
}

function esTipoSolicitudPuenteEqualizador(
  valor: unknown,
): valor is TipoSolicitudPuenteEqualizador {
  return (
    valor === 'ping' ||
    valor === 'obtener-estado' ||
    valor === 'aplicar-ajustes'
  );
}

export function esSolicitudPuenteEqualizador(
  valor: unknown,
): valor is SolicitudPuenteEqualizador {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  const mensaje = valor as Partial<SolicitudPuenteEqualizador>;

  if (
    mensaje.canal !== CANAL_SOLICITUD_EQUALIZADOR ||
    typeof mensaje.id !== 'string' ||
    !esTipoSolicitudPuenteEqualizador(mensaje.tipo)
  ) {
    return false;
  }

  if (mensaje.tipo === 'aplicar-ajustes') {
    return Boolean(mensaje.ajustes) && typeof mensaje.ajustes === 'object';
  }

  return true;
}

export function esRespuestaPuenteEqualizador(
  valor: unknown,
): valor is RespuestaPuenteEqualizador {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  const mensaje = valor as Partial<RespuestaPuenteEqualizador>;

  if (
    mensaje.canal !== CANAL_RESPUESTA_EQUALIZADOR ||
    typeof mensaje.id !== 'string' ||
    !esTipoSolicitudPuenteEqualizador(mensaje.tipo) ||
    typeof mensaje.ok !== 'boolean'
  ) {
    return false;
  }

  if (mensaje.ok) {
    if (mensaje.tipo === 'ping') {
      return true;
    }

    return 'estado' in mensaje && Boolean(mensaje.estado) && typeof mensaje.estado === 'object';
  }

  return 'error' in mensaje && typeof mensaje.error === 'string';
}

export function esMensajeListoEqualizador(
  valor: unknown,
): valor is MensajeListoEqualizador {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  return (valor as Partial<MensajeListoEqualizador>).canal === CANAL_LISTO_EQUALIZADOR;
}