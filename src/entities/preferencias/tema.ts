/**
 * Tema de color del popup.
 *
 * Constantes de la paleta secundaria oficial de SoundCloud (Media Kit) y
 * helpers de conversión hex ↔ RGB. Sin acceso al DOM ni a storage.
 */

export const COLOR_TEMA_POR_DEFECTO = '#ff5500';

/** Paleta secundaria oficial de SoundCloud (Media Kit). */
export const COLORES_TEMA_PRESET = [
  '#ff5500', // SoundCloud Orange
  '#dcf400', // Lime
  '#ffb200', // Yellow
  '#ec2e10', // Red
  '#ffa4f3', // Pink
  '#b3a2f2', // Lavender
  '#4e83db', // Blue
  '#98826d', // Beige
] as const;

export type ColorTemaPreset = (typeof COLORES_TEMA_PRESET)[number];

export type Rgb = { r: number; g: number; b: number };

export function normalizarColorTema(valor: string | null | undefined): string {
  // Compatibilidad hacia atrás con la versión que guardaba "naranja".
  if (valor === 'naranja') return COLOR_TEMA_POR_DEFECTO;
  if (typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor)) {
    return valor.toLowerCase();
  }
  return COLOR_TEMA_POR_DEFECTO;
}

export function hexARgb(hex: string): Rgb {
  const valor = normalizarColorTema(hex).slice(1);
  return {
    r: Number.parseInt(valor.slice(0, 2), 16),
    g: Number.parseInt(valor.slice(2, 4), 16),
    b: Number.parseInt(valor.slice(4, 6), 16),
  };
}

export function rgbATripleta(rgb: Rgb): string {
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

export function esColorPreset(valor: string): boolean {
  const normalizado = valor.toLowerCase();
  return (COLORES_TEMA_PRESET as readonly string[]).includes(normalizado);
}
