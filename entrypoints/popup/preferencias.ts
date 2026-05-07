/**
 * Preferencias del popup (no relacionadas con el tema de color).
 *
 * Agrupa los valores por defecto y helpers de validación para que la capa de
 * persistencia pueda reutilizarlos sin duplicar reglas.
 */

export const INTERVALOS_ACTUALIZACION = [2000, 4000, 8000] as const;
export type IntervaloActualizacion = (typeof INTERVALOS_ACTUALIZACION)[number];

export const INTERVALO_POR_DEFECTO: IntervaloActualizacion = 4000;
export const MOSTRAR_DESCARGA_MP3_POR_DEFECTO = true;
export const MODO_COMPACTO_POR_DEFECTO = false;
export const VERSION_NOTIF_VISTA_POR_DEFECTO = '';

export function esIntervaloValido(valor: number): valor is IntervaloActualizacion {
  return (INTERVALOS_ACTUALIZACION as readonly number[]).includes(valor);
}
