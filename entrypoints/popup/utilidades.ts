import type {
  EstadoVista,
  RespuestaPopup,
} from '../../lib/contratos';
import type { Textos } from './i18n';

export function unirClases(
  ...clases: Array<string | false | null | undefined>
) {
  return clases.filter(Boolean).join(' ');
}

export function etiquetaEstado(respuesta: RespuestaPopup, t: Textos) {
  switch (respuesta.estadoVista) {
    case 'disponible':
      return t.estadoActivo;
    case 'sin-pestana':
      return t.estadoSinPestana;
    case 'sin-reproductor':
      return t.estadoSinReproductor;
    case 'cargando':
      return t.estadoCargando;
    case 'error':
      return t.estadoError;
    default:
      return t.estadoPopup;
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