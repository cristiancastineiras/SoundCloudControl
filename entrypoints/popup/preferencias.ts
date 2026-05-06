/**
 * Preferencias persistentes del popup (no relacionadas con el tema de color).
 *
 * Centraliza el acceso a localStorage en helpers tipados para evitar lecturas
 * y escrituras desperdigadas por App.tsx y los componentes.
 */

const CLAVE_INTERVALO = 'sc-control-intervalo';
const CLAVE_MOSTRAR_DESCARGA_MP3 = 'sc-control-mostrar-descarga-mp3';

export const INTERVALOS_ACTUALIZACION = [2000, 4000, 8000] as const;
export type IntervaloActualizacion = (typeof INTERVALOS_ACTUALIZACION)[number];

const INTERVALO_POR_DEFECTO: IntervaloActualizacion = 4000;

function esIntervaloValido(valor: number): valor is IntervaloActualizacion {
  return (INTERVALOS_ACTUALIZACION as readonly number[]).includes(valor);
}

export function leerIntervalo(): IntervaloActualizacion {
  try {
    const valor = Number(localStorage.getItem(CLAVE_INTERVALO));
    return esIntervaloValido(valor) ? valor : INTERVALO_POR_DEFECTO;
  } catch {
    return INTERVALO_POR_DEFECTO;
  }
}

export function guardarIntervalo(intervalo: IntervaloActualizacion): void {
  try {
    localStorage.setItem(CLAVE_INTERVALO, String(intervalo));
  } catch {
    /* sin acceso a localStorage */
  }
}

export function leerMostrarDescargaMp3(): boolean {
  try {
    const guardado = localStorage.getItem(CLAVE_MOSTRAR_DESCARGA_MP3);
    if (guardado === 'false') return false;
    if (guardado === 'true') return true;
  } catch {
    /* sin acceso a localStorage */
  }
  return true;
}

export function guardarMostrarDescargaMp3(mostrar: boolean): void {
  try {
    localStorage.setItem(CLAVE_MOSTRAR_DESCARGA_MP3, String(mostrar));
  } catch {
    /* sin acceso a localStorage */
  }
}
