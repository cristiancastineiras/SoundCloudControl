import type {
  EstadoCancion,
  EstadoVista,
  RespuestaPopup,
} from '../../lib/contratos';

export function unirClases(
  ...clases: Array<string | false | null | undefined>
) {
  return clases.filter(Boolean).join(' ');
}

export function descripcionPortada(cancion: EstadoCancion | null) {
  if (!cancion) {
    return 'Portada de SoundCloud';
  }

  return `Portada de ${cancion.titulo} de ${cancion.artista || 'SoundCloud'}`;
}

export function etiquetaEstado(respuesta: RespuestaPopup) {
  switch (respuesta.estadoVista) {
    case 'disponible':
      return 'Activo';
    case 'sin-pestana':
      return 'Sin pestaña';
    case 'sin-reproductor':
      return 'Sin reproductor';
    case 'cargando':
      return 'Cargando';
    case 'error':
      return 'Error';
    default:
      return 'Estado';
  }
}

export function mensajeSecundario(respuesta: RespuestaPopup) {
  if (respuesta.estadoVista === 'disponible') {
    return '';
  }

  return respuesta.mensaje;
}

export function clasesIndicador(estadoVista: EstadoVista) {
  switch (estadoVista) {
    case 'disponible':
      return 'bg-bosque-400/20';
    case 'cargando':
      return 'bg-[#ffc25c]/20';
    case 'sin-pestana':
    case 'sin-reproductor':
      return 'bg-white/10';
    case 'error':
      return 'bg-rojo-400/20';
    default:
      return 'bg-white/10';
  }
}