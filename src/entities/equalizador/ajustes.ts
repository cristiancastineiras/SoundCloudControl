/**
 * Configuración del equalizador.
 *
 * Pure domain: tipos, constantes, factories y normalización.
 * Sin acceso a Web Audio ni browser APIs (eso vive en
 * `services/puenteEqualizador`).
 */

export const GANANCIA_EQUALIZADOR_MIN = -12;
export const GANANCIA_EQUALIZADOR_MAX = 12;
export const PASO_EQUALIZADOR = 0.5;

type TipoFiltroEqualizador = 'lowshelf' | 'peaking' | 'highshelf';

export const BANDAS_EQUALIZADOR = [
  { id: 'hz32', frecuencia: 32, etiqueta: '32 Hz', tipoFiltro: 'lowshelf', q: 0.72 },
  { id: 'hz64', frecuencia: 64, etiqueta: '64 Hz', tipoFiltro: 'peaking', q: 0.9 },
  { id: 'hz125', frecuencia: 125, etiqueta: '125 Hz', tipoFiltro: 'peaking', q: 1 },
  { id: 'hz250', frecuencia: 250, etiqueta: '250 Hz', tipoFiltro: 'peaking', q: 1 },
  { id: 'hz500', frecuencia: 500, etiqueta: '500 Hz', tipoFiltro: 'peaking', q: 1 },
  { id: 'hz1000', frecuencia: 1000, etiqueta: '1 kHz', tipoFiltro: 'peaking', q: 1 },
  { id: 'hz2000', frecuencia: 2000, etiqueta: '2 kHz', tipoFiltro: 'peaking', q: 1 },
  { id: 'hz4000', frecuencia: 4000, etiqueta: '4 kHz', tipoFiltro: 'peaking', q: 0.95 },
  { id: 'hz8000', frecuencia: 8000, etiqueta: '8 kHz', tipoFiltro: 'peaking', q: 0.9 },
  { id: 'hz16000', frecuencia: 16000, etiqueta: '16 kHz', tipoFiltro: 'highshelf', q: 0.72 },
] as const satisfies readonly {
  id: string;
  frecuencia: number;
  etiqueta: string;
  tipoFiltro: TipoFiltroEqualizador;
  q: number;
}[];

export type IdBandaEqualizador = (typeof BANDAS_EQUALIZADOR)[number]['id'];

export interface AjustesEqualizador {
  habilitado: boolean;
  presetId: IdPresetEqualizador | 'personalizado';
  preamp: number;
  bandas: Record<IdBandaEqualizador, number>;
}

export type EstadoContextoEqualizador =
  | 'running'
  | 'suspended'
  | 'closed'
  | 'unavailable';

export interface EstadoEqualizador extends AjustesEqualizador {
  audioDetectado: boolean;
  procesando: boolean;
  requiereInteraccion: boolean;
  estadoContexto: EstadoContextoEqualizador;
}

function crearBandas(valores: Partial<Record<IdBandaEqualizador, number>>) {
  return {
    hz32: valores.hz32 ?? 0,
    hz64: valores.hz64 ?? 0,
    hz125: valores.hz125 ?? 0,
    hz250: valores.hz250 ?? 0,
    hz500: valores.hz500 ?? 0,
    hz1000: valores.hz1000 ?? 0,
    hz2000: valores.hz2000 ?? 0,
    hz4000: valores.hz4000 ?? 0,
    hz8000: valores.hz8000 ?? 0,
    hz16000: valores.hz16000 ?? 0,
  } satisfies Record<IdBandaEqualizador, number>;
}

export const PRESETS_EQUALIZADOR = {
  flat: {
    preamp: 0,
    bandas: crearBandas({}),
  },
  bassBoost: {
    preamp: -1,
    bandas: crearBandas({
      hz32: 6, hz64: 5, hz125: 3.5, hz250: 1.5, hz500: 0,
      hz1000: -1, hz2000: -1.5, hz4000: -1, hz8000: 0.5, hz16000: 1,
    }),
  },
  vocal: {
    preamp: 0,
    bandas: crearBandas({
      hz32: -2, hz64: -1.5, hz125: -1, hz250: 0.5, hz500: 2,
      hz1000: 3, hz2000: 3.5, hz4000: 2.5, hz8000: 1, hz16000: 0,
    }),
  },
  electronic: {
    preamp: -0.5,
    bandas: crearBandas({
      hz32: 4, hz64: 3, hz125: 1, hz250: -1, hz500: -1.5,
      hz1000: 0, hz2000: 1.5, hz4000: 2.5, hz8000: 3, hz16000: 2,
    }),
  },
  brillo: {
    preamp: -0.5,
    bandas: crearBandas({
      hz32: -2, hz64: -1, hz125: 0, hz250: 0, hz500: 0.5,
      hz1000: 1, hz2000: 2, hz4000: 3, hz8000: 4.5, hz16000: 5,
    }),
  },
} as const;

export type IdPresetEqualizador = keyof typeof PRESETS_EQUALIZADOR;

export const IDS_PRESET_EQUALIZADOR = Object.keys(
  PRESETS_EQUALIZADOR,
) as IdPresetEqualizador[];

export function crearBandasPlanas() {
  return crearBandas({});
}

export function crearAjustesEqualizadorDesdePreset(
  presetId: IdPresetEqualizador,
): AjustesEqualizador {
  const preset = PRESETS_EQUALIZADOR[presetId];
  return {
    habilitado: false,
    presetId,
    preamp: preset.preamp,
    bandas: { ...preset.bandas },
  };
}

export const AJUSTES_EQUALIZADOR_POR_DEFECTO =
  crearAjustesEqualizadorDesdePreset('flat');

export function clonarAjustesEqualizador(
  ajustes: AjustesEqualizador = AJUSTES_EQUALIZADOR_POR_DEFECTO,
): AjustesEqualizador {
  return {
    habilitado: ajustes.habilitado,
    presetId: ajustes.presetId,
    preamp: ajustes.preamp,
    bandas: { ...ajustes.bandas },
  };
}

export function normalizarGananciaEqualizador(valor: number) {
  if (!Number.isFinite(valor)) return 0;
  const valorAjustado = Math.round(valor / PASO_EQUALIZADOR) * PASO_EQUALIZADOR;
  return Math.max(
    GANANCIA_EQUALIZADOR_MIN,
    Math.min(GANANCIA_EQUALIZADOR_MAX, valorAjustado),
  );
}

function esPresetEqualizador(valor: string): valor is IdPresetEqualizador {
  return valor in PRESETS_EQUALIZADOR;
}

export function inferirPresetEqualizador(
  ajustes: Pick<AjustesEqualizador, 'preamp' | 'bandas'>,
): IdPresetEqualizador | 'personalizado' {
  for (const presetId of IDS_PRESET_EQUALIZADOR) {
    const preset = PRESETS_EQUALIZADOR[presetId];
    const coincidePreamp = ajustes.preamp === preset.preamp;
    const coincideBandas = BANDAS_EQUALIZADOR.every(
      ({ id }) => ajustes.bandas[id] === preset.bandas[id],
    );
    if (coincidePreamp && coincideBandas) return presetId;
  }
  return 'personalizado';
}

export function normalizarAjustesEqualizador(valor: unknown): AjustesEqualizador {
  const posibleValor =
    valor && typeof valor === 'object'
      ? (valor as Partial<AjustesEqualizador>)
      : undefined;
  const presetBase =
    typeof posibleValor?.presetId === 'string' && esPresetEqualizador(posibleValor.presetId)
      ? crearAjustesEqualizadorDesdePreset(posibleValor.presetId)
      : clonarAjustesEqualizador();
  const bandasOrigen =
    posibleValor?.bandas && typeof posibleValor.bandas === 'object'
      ? (posibleValor.bandas as Partial<Record<IdBandaEqualizador, unknown>>)
      : {};
  const bandas = crearBandasPlanas();

  for (const { id } of BANDAS_EQUALIZADOR) {
    const valorBanda = bandasOrigen[id];
    bandas[id] =
      typeof valorBanda === 'number'
        ? normalizarGananciaEqualizador(valorBanda)
        : presetBase.bandas[id];
  }

  const preamp =
    typeof posibleValor?.preamp === 'number'
      ? normalizarGananciaEqualizador(posibleValor.preamp)
      : presetBase.preamp;
  const habilitado =
    typeof posibleValor?.habilitado === 'boolean'
      ? posibleValor.habilitado
      : presetBase.habilitado;
  const ajustesNormalizados = {
    habilitado,
    preamp,
    bandas,
    presetId: 'personalizado' as const,
  };

  return {
    ...ajustesNormalizados,
    presetId: inferirPresetEqualizador(ajustesNormalizados),
  };
}

export function mezclarAjustesEqualizador(
  base: AjustesEqualizador,
  parche: Partial<AjustesEqualizador>,
): AjustesEqualizador {
  return normalizarAjustesEqualizador({
    ...base,
    ...parche,
    bandas: { ...base.bandas, ...parche.bandas },
  });
}

function normalizarEstadoContexto(
  valor: string | null | undefined,
): EstadoContextoEqualizador {
  if (valor === 'running' || valor === 'suspended' || valor === 'closed' || valor === 'unavailable') {
    return valor;
  }
  return 'unavailable';
}

export function crearEstadoEqualizador(
  valor?: Partial<EstadoEqualizador> | AjustesEqualizador,
): EstadoEqualizador {
  const ajustes = normalizarAjustesEqualizador(valor);
  const posibleEstado = valor as Partial<EstadoEqualizador> | undefined;
  return {
    ...ajustes,
    audioDetectado: Boolean(posibleEstado?.audioDetectado),
    procesando: Boolean(posibleEstado?.procesando),
    requiereInteraccion: Boolean(posibleEstado?.requiereInteraccion),
    estadoContexto: normalizarEstadoContexto(posibleEstado?.estadoContexto),
  };
}

/**
 * Resumen serializable de unos ajustes para uso en logs.
 * Filtra bandas a 0 para no inundar la consola.
 */
export function resumirAjustesEqualizador(origen: AjustesEqualizador) {
  return {
    habilitado: origen.habilitado,
    presetId: origen.presetId,
    preamp: origen.preamp,
    bandasActivas: Object.entries(origen.bandas)
      .filter(([, ganancia]) => ganancia !== 0)
      .map(([id, ganancia]) => `${id}:${ganancia}`),
  };
}
