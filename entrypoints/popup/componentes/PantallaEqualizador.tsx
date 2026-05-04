import { ArrowLeft, SlidersHorizontal } from '@phosphor-icons/react';
import { type CSSProperties, type Ref, useId } from 'react';
import type { RespuestaEqualizador } from '../../../lib/contratos';
import {
  BANDAS_EQUALIZADOR,
  GANANCIA_EQUALIZADOR_MAX,
  GANANCIA_EQUALIZADOR_MIN,
  IDS_PRESET_EQUALIZADOR,
  PASO_EQUALIZADOR,
  type IdBandaEqualizador,
  type IdPresetEqualizador,
} from '../../../lib/equalizer';
import type { Textos } from '../i18n';
import { unirClases } from '../utilidades';

const ESTILO_FONDO_EQUALIZADOR: CSSProperties = {
  background:
    'radial-gradient(circle at top left, rgb(var(--sc-theme-rgb) / 0.16), transparent 36%), linear-gradient(180deg, rgba(15, 14, 13, 0.98) 0%, rgba(9, 8, 8, 0.99) 100%)',
};

const CLASE_BOTON_SECUNDARIO =
  'inline-flex items-center justify-center rounded-[12px] border border-white/10 bg-white/5 px-3 py-2 text-[0.78rem] font-semibold text-marfil/78 transition duration-150 hover:border-white/24 hover:text-marfil';

export function PantallaEqualizador(props: {
  panelId: string;
  ayudaId: string;
  t: Textos;
  respuesta: RespuestaEqualizador;
  guardando: boolean;
  backButtonRef?: Ref<HTMLButtonElement>;
  onVolver: () => void;
  onCambiarHabilitado: (habilitado: boolean) => void;
  onCambiarPreamp: (valor: number) => void;
  onCambiarBanda: (id: IdBandaEqualizador, valor: number) => void;
  onAplicarPreset: (id: IdPresetEqualizador) => void;
  onRestablecer: () => void;
  onAbrirSoundCloud: () => void;
}) {
  const {
    ayudaId,
    backButtonRef,
    guardando,
    onAbrirSoundCloud,
    onAplicarPreset,
    onCambiarBanda,
    onCambiarHabilitado,
    onCambiarPreamp,
    onRestablecer,
    onVolver,
    panelId,
    respuesta,
    t,
  } = props;
  const estado = respuesta.equalizador;
  const presetsId = useId();
  const preampId = useId();
  const bandasId = useId();
  const estiloChipActivo: CSSProperties = {
    borderColor: 'rgb(var(--sc-theme-rgb) / 0.58)',
    backgroundImage:
      'linear-gradient(180deg, rgb(var(--sc-theme-rgb) / 0.30), rgb(var(--sc-theme-rgb) / 0.12))',
    color: '#fff7f1',
    boxShadow: '0 0 0 1px rgb(var(--sc-theme-rgb) / 0.14)',
  };

  return (
    <div
      id={panelId}
      className="relative z-10 flex flex-col gap-4 px-4 pb-5 pt-4"
      role="region"
      aria-labelledby="sc-eq-title"
      aria-describedby={ayudaId}
      style={ESTILO_FONDO_EQUALIZADOR}>
      <header className="flex items-center gap-3">
        <button
          type="button"
          ref={backButtonRef}
          onClick={onVolver}
          aria-label={t.volverAlReproductor}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/6 text-marfil/70 transition hover:border-white/25 hover:text-marfil">
          <ArrowLeft size={15} weight="bold" />
        </button>

        <div className="min-w-0 flex-1">
          <h2 id="sc-eq-title" className="m-0 text-[0.95rem] font-bold tracking-tight text-marfil">
            {t.equalizador}
          </h2>
          <p className="m-0 text-[0.72rem] text-marfil/48">{t.eqSoloSoundCloud}</p>
        </div>

        <span
          className="rounded-full border border-white/10 bg-black/32 px-2.5 py-1 text-[0.7rem] font-semibold text-marfil/78"
          role="status"
          aria-live="polite">
          {guardando ? t.eqSincronizando : estado.habilitado ? t.eqActivado : t.eqDesactivado}
        </span>
      </header>

      <p id={ayudaId} className="sr-only">{t.volverConEscape}</p>

      <div className="rounded-2xl border border-white/8 bg-black/28 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2 flex items-center gap-2 text-[0.76rem] font-semibold text-marfil/90">
          <SlidersHorizontal size={14} weight="bold" className="shrink-0" />
          <span>{respuesta.mensaje}</span>
        </div>

        <div className="flex flex-wrap gap-2 text-[0.7rem] font-semibold">
          <ChipEstado>{etiquetaEstadoVista(respuesta.estadoVista, t)}</ChipEstado>
          <ChipEstado activa={estado.audioDetectado}>{estado.audioDetectado ? t.eqAudioDetectado : t.eqAudioNoDetectado}</ChipEstado>
          <ChipEstado activa={estado.procesando}>{estado.procesando ? t.eqProcesando : t.eqEnEspera}</ChipEstado>
          <ChipEstado>{etiquetaContexto(estado.estadoContexto, t)}</ChipEstado>
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby={presetsId}>
        <h3 id={presetsId} className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-marfil/40">
          {t.eqPresets}
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {IDS_PRESET_EQUALIZADOR.map((presetId) => {
            const activo = estado.presetId === presetId;

            return (
              <button
                key={presetId}
                type="button"
                className={unirClases(CLASE_BOTON_SECUNDARIO, 'justify-start text-left')}
                style={activo ? estiloChipActivo : undefined}
                aria-pressed={activo}
                aria-label={t.eqAplicarPreset(obtenerEtiquetaPreset(presetId, t))}
                onClick={() => onAplicarPreset(presetId)}>
                {obtenerEtiquetaPreset(presetId, t)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={unirClases(CLASE_BOTON_SECUNDARIO, 'min-w-33')}
            style={estado.habilitado ? estiloChipActivo : undefined}
            aria-pressed={estado.habilitado}
            onClick={() => onCambiarHabilitado(!estado.habilitado)}>
            {estado.habilitado ? t.eqDeshabilitar : t.eqHabilitar}
          </button>

          <button
            type="button"
            className={unirClases(CLASE_BOTON_SECUNDARIO, 'ml-auto')}
            onClick={onRestablecer}>
            {t.eqReset}
          </button>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/4 px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 id={preampId} className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-marfil/40">
              {t.eqPreamp}
            </h3>
            <span className="text-[0.78rem] font-semibold text-marfil/80">
              {formatearDb(estado.preamp)}
            </span>
          </div>

          <input
            type="range"
            min={GANANCIA_EQUALIZADOR_MIN}
            max={GANANCIA_EQUALIZADOR_MAX}
            step={PASO_EQUALIZADOR}
            value={estado.preamp}
            onChange={(evento) => {
              onCambiarPreamp(Number(evento.target.value));
            }}
            aria-labelledby={preampId}
            aria-label={t.eqPreampActual(estado.preamp)}
            className="slider-equalizer h-2 w-full appearance-none rounded-full border border-transparent"
            style={estiloSlider(estado.preamp)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby={bandasId}>
        <h3 id={bandasId} className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-marfil/40">
          {t.eqBandas}
        </h3>

        <div className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/4 px-3.5 py-3">
          {BANDAS_EQUALIZADOR.map((banda) => {
            const valor = estado.bandas[banda.id];

            return (
              <label key={banda.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-[0.78rem]">
                  <span className="font-semibold text-marfil/84">{banda.etiqueta}</span>
                  <span className="font-mono text-marfil/56">{formatearDb(valor)}</span>
                </div>

                <input
                  type="range"
                  min={GANANCIA_EQUALIZADOR_MIN}
                  max={GANANCIA_EQUALIZADOR_MAX}
                  step={PASO_EQUALIZADOR}
                  value={valor}
                  onChange={(evento) => {
                    onCambiarBanda(banda.id, Number(evento.target.value));
                  }}
                  aria-label={t.eqGananciaActual(banda.etiqueta, valor)}
                  className="slider-equalizer h-2 w-full appearance-none rounded-full border border-transparent"
                  style={estiloSlider(valor)}
                />
              </label>
            );
          })}
        </div>
      </section>

      {respuesta.estadoVista === 'sin-pestana' ? (
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/12 bg-black/70 text-sm font-semibold text-marfil transition duration-150 hover:-translate-y-px hover:border-[#ffc28c]/60"
          onClick={onAbrirSoundCloud}>
          {t.abrirSoundCloud}
        </button>
      ) : null}
    </div>
  );
}

function ChipEstado(props: { children: string; activa?: boolean }) {
  return (
    <span
      className={unirClases(
        'rounded-full border px-2.5 py-1',
        props.activa
          ? 'border-white/16 bg-white/10 text-marfil/92'
          : 'border-white/8 bg-black/26 text-marfil/58',
      )}>
      {props.children}
    </span>
  );
}

function obtenerEtiquetaPreset(presetId: IdPresetEqualizador, t: Textos) {
  switch (presetId) {
    case 'flat':
      return t.eqPresetFlat;
    case 'bassBoost':
      return t.eqPresetBassBoost;
    case 'vocal':
      return t.eqPresetVocal;
    case 'electronic':
      return t.eqPresetElectronic;
    case 'brillo':
      return t.eqPresetBrillo;
    default:
      return t.equalizador;
  }
}

function etiquetaEstadoVista(estadoVista: RespuestaEqualizador['estadoVista'], t: Textos) {
  switch (estadoVista) {
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
      return t.equalizador;
  }
}

function etiquetaContexto(
  estadoContexto: RespuestaEqualizador['equalizador']['estadoContexto'],
  t: Textos,
) {
  switch (estadoContexto) {
    case 'running':
      return t.eqContextoActivo;
    case 'suspended':
      return t.eqContextoSuspendido;
    case 'closed':
      return t.eqContextoCerrado;
    default:
      return t.eqContextoNoDisponible;
  }
}

function formatearDb(valor: number) {
  return `${valor > 0 ? '+' : ''}${valor.toFixed(1)} dB`;
}

function estiloSlider(valor: number): CSSProperties {
  const progreso =
    ((valor - GANANCIA_EQUALIZADOR_MIN) /
      (GANANCIA_EQUALIZADOR_MAX - GANANCIA_EQUALIZADOR_MIN)) *
    100;

  return {
    backgroundImage: `linear-gradient(90deg, rgb(var(--sc-theme-rgb) / 0.92) 0%, rgb(var(--sc-theme-rgb) / 0.92) ${progreso}%, rgba(255, 255, 255, 0.12) ${progreso}%, rgba(255, 255, 255, 0.12) 100%)`,
  };
}