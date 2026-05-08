/**
 * Modelo del dominio "reproductor de SoundCloud".
 * Sólo tipos, constantes y type guards. Sin I/O.
 */

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
  velocidadReproduccion: number;
}

export const ACCIONES_POR_COMANDO: Record<ComandoRapido, AccionReproductor> = {
  [COMANDOS_RAPIDOS.cancionAnterior]: ACCIONES_REPRODUCTOR.cancionAnterior,
  [COMANDOS_RAPIDOS.alternarReproduccion]: ACCIONES_REPRODUCTOR.alternarReproduccion,
  [COMANDOS_RAPIDOS.siguienteCancion]: ACCIONES_REPRODUCTOR.siguienteCancion,
};

export function esComandoRapido(valor: string): valor is ComandoRapido {
  return Object.values(COMANDOS_RAPIDOS).includes(valor as ComandoRapido);
}
