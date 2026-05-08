import {
  crearEstadoEqualizador,
  type AjustesEqualizador,
  type EstadoEqualizador,
} from './equalizer';

export const URL_BASE_SOUNDCLOUD = 'https://soundcloud.com/';

export const PATRONES_SOUNDCLOUD = [
  '*://soundcloud.com/*',
  '*://*.soundcloud.com/*',
] as const;

export const COMANDOS_RAPIDOS = {
  cancionAnterior: 'previous-song',
  alternarReproduccion: 'toggle-playback',
  siguienteCancion: 'next-song',
} as const;

export const ACCIONES_REPRODUCTOR = {
  obtenerEstado: 'obtener-estado',
  cancionAnterior: 'cancion-anterior',
  alternarReproduccion: 'alternar-reproduccion',
  siguienteCancion: 'siguiente-cancion',
  alternarMeGusta: 'alternar-me-gusta',
  alternarSeguirArtista: 'alternar-seguir-artista',
  alternarAleatorio: 'alternar-aleatorio',
  alternarSilencio: 'alternar-silencio',
  establecerRepeticionLista: 'establecer-repeticion-lista',
  establecerRepeticionPista: 'establecer-repeticion-pista',
  desactivarRepeticion: 'desactivar-repeticion',
} as const;

export const MODOS_REPETICION = {
  apagado: 'apagado',
  lista: 'lista',
  pista: 'pista',
} as const;

export type ComandoRapido =
  (typeof COMANDOS_RAPIDOS)[keyof typeof COMANDOS_RAPIDOS];

export type AccionReproductor = Exclude<
  (typeof ACCIONES_REPRODUCTOR)[keyof typeof ACCIONES_REPRODUCTOR],
  typeof ACCIONES_REPRODUCTOR.obtenerEstado
>;

export type ModoRepeticion =
  (typeof MODOS_REPETICION)[keyof typeof MODOS_REPETICION];

export type EstadoVista =
  | 'disponible'
  | 'sin-pestana'
  | 'sin-reproductor'
  | 'cargando'
  | 'error';

export interface EstadoCancion {
  artista: string;
  titulo: string;
  urlArtista: string | null;
  urlCancion: string | null;
  urlImagen: string | null;
  puedeSeguirArtista: boolean;
  siguiendoArtista: boolean;
  reproduciendo: boolean;
  meGustaActivo: boolean;
  aleatorioActivo: boolean;
  modoRepeticion: ModoRepeticion;
  volumen: number;
  silenciado: boolean;
}

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

export type SolicitudPopup =
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'obtener-estado';
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'ejecutar-accion';
      accion: AccionReproductor;
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'abrir-soundcloud';
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'abrir-enlace';
      url: string;
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'ajustar-volumen';
      volumen: number;
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'descargar-cancion';
      urlCancion: string;
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'obtener-equalizador';
    }
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'guardar-equalizador';
      ajustes: AjustesEqualizador;
    };

export type SolicitudBackground =
  | SolicitudPopup
  | {
      canal: 'soundcloud-control';
      destino: 'background';
      tipo: 'obtener-configuracion-equalizador';
    };

export interface RespuestaDescarga {
  tipo: 'descarga';
  exito: boolean;
  mensaje: string;
}

export type SolicitudContenido =
  | {
      canal: 'soundcloud-control';
      tipo: typeof ACCIONES_REPRODUCTOR.obtenerEstado;
    }
  | {
      canal: 'soundcloud-control';
      tipo: AccionReproductor;
    }
  | {
      canal: 'soundcloud-control';
      tipo: 'ajustar-volumen';
      volumen: number;
    }
  | {
      canal: 'soundcloud-control';
      tipo: 'obtener-equalizador';
    }
  | {
      canal: 'soundcloud-control';
      tipo: 'aplicar-equalizador';
      ajustes: AjustesEqualizador;
    };

export const ACCIONES_POR_COMANDO: Record<ComandoRapido, AccionReproductor> = {
  [COMANDOS_RAPIDOS.cancionAnterior]: ACCIONES_REPRODUCTOR.cancionAnterior,
  [COMANDOS_RAPIDOS.alternarReproduccion]:
    ACCIONES_REPRODUCTOR.alternarReproduccion,
  [COMANDOS_RAPIDOS.siguienteCancion]: ACCIONES_REPRODUCTOR.siguienteCancion,
};

export function esComandoRapido(valor: string): valor is ComandoRapido {
  return Object.values(COMANDOS_RAPIDOS).includes(valor as ComandoRapido);
}

export function esSolicitudPopup(valor: unknown): valor is SolicitudPopup {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  const posibleMensaje = valor as Partial<SolicitudPopup>;

  if (posibleMensaje.tipo === 'ajustar-volumen') {
    return (
      posibleMensaje.canal === 'soundcloud-control' &&
      posibleMensaje.destino === 'background' &&
      typeof posibleMensaje.volumen === 'number'
    );
  }

  if (posibleMensaje.tipo === 'guardar-equalizador') {
    return (
      posibleMensaje.canal === 'soundcloud-control' &&
      posibleMensaje.destino === 'background' &&
      Boolean(posibleMensaje.ajustes) &&
      typeof posibleMensaje.ajustes === 'object'
    );
  }

  return (
    posibleMensaje.canal === 'soundcloud-control' &&
    posibleMensaje.destino === 'background' &&
    typeof posibleMensaje.tipo === 'string'
  );
}

export function esSolicitudBackground(valor: unknown): valor is SolicitudBackground {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  const posibleMensaje = valor as Partial<SolicitudBackground>;

  if (posibleMensaje.tipo === 'obtener-configuracion-equalizador') {
    return (
      posibleMensaje.canal === 'soundcloud-control' &&
      posibleMensaje.destino === 'background'
    );
  }

  return esSolicitudPopup(valor);
}

export function esSolicitudContenido(valor: unknown): valor is SolicitudContenido {
  if (!valor || typeof valor !== 'object') {
    return false;
  }

  const posibleMensaje = valor as Partial<SolicitudContenido>;

  if (posibleMensaje.tipo === 'ajustar-volumen') {
    return (
      posibleMensaje.canal === 'soundcloud-control' &&
      typeof posibleMensaje.volumen === 'number'
    );
  }

  if (posibleMensaje.tipo === 'aplicar-equalizador') {
    return (
      posibleMensaje.canal === 'soundcloud-control' &&
      Boolean(posibleMensaje.ajustes) &&
      typeof posibleMensaje.ajustes === 'object'
    );
  }

  return (
    posibleMensaje.canal === 'soundcloud-control' &&
    typeof posibleMensaje.tipo === 'string'
  );
}

export function crearRespuestaPopup(
  estadoVista: EstadoVista,
  cancion: EstadoCancion | null,
  mensaje: string,
): RespuestaPopup {
  return {
    estadoVista,
    cancion,
    mensaje,
  };
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