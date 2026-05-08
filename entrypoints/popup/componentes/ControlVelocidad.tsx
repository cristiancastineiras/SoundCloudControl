import type { Textos } from '@/features/i18n';
import { IconoControl } from './IconoControl';

const PASOS_VELOCIDAD = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function estiloSliderVelocidad(velocidad: number): Record<string, string> {
  // Mapear 0.25–2 al rango 0–100 % para el degradado del track.
  const porcentaje = Math.round(((velocidad - 0.25) / (2 - 0.25)) * 100);
  return {
    backgroundImage: `linear-gradient(to right, var(--sc-color) 0%, var(--sc-color) ${porcentaje}%, rgba(255,255,255,0.10) ${porcentaje}%)`,
  };
}

export function ControlVelocidad(props: {
  velocidad: number;
  bloqueado: boolean;
  compacto?: boolean;
  t: Textos;
  onCambiarVelocidad: (velocidad: number) => void;
}) {
  const {
    bloqueado,
    compacto = false,
    onCambiarVelocidad,
    t,
    velocidad,
  } = props;

  const velocidadNormalizada = Math.max(0.25, Math.min(2, velocidad));
  const tituloId = compacto ? 'sc-speed-title-compact' : 'sc-speed-title';
  const esNormal = Math.abs(velocidadNormalizada - 1) < 0.01;

  if (compacto) {
    return (
      <div className="flex items-center gap-3" role="group" aria-labelledby={tituloId}>
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/8 bg-white/4 text-marfil/60"
          aria-hidden="true">
          <IconoControl nombre="velocidad" className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <span id={tituloId} className="sr-only">{t.velocidad}</span>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={velocidadNormalizada}
            onChange={(e) => onCambiarVelocidad(Number(e.currentTarget.value))}
            disabled={bloqueado}
            aria-label={t.velocidadActual(velocidadNormalizada)}
            className="slider-volumen h-1.75 w-full appearance-none rounded-full border border-transparent bg-white/10"
            style={estiloSliderVelocidad(velocidadNormalizada)}
          />
        </div>

        <span className="min-w-11 text-right font-mono text-[0.72rem] font-semibold text-marfil/65">
          {velocidadNormalizada.toFixed(2)}x
        </span>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-white/4 px-3.5 py-3" aria-labelledby={tituloId}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/8 bg-black/32 text-marfil/70"
            aria-hidden="true">
            <IconoControl nombre="velocidad" />
          </span>

          <div className="min-w-0">
            <h3 id={tituloId} className="sc-section-title">{t.velocidad}</h3>
            <p className="m-0 text-[0.74rem] text-marfil/45">
              {t.velocidadActual(velocidadNormalizada)}
            </p>
          </div>
        </div>

        {!esNormal ? (
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[0.68rem] font-semibold text-marfil/40 transition-colors hover:text-marfil/75 disabled:opacity-40"
            disabled={bloqueado}
            aria-label="1.00x"
            onClick={() => onCambiarVelocidad(1)}>
            1.00x
          </button>
        ) : null}
      </div>

      <input
        type="range"
        min={0.25}
        max={2}
        step={0.05}
        value={velocidadNormalizada}
        onChange={(e) => onCambiarVelocidad(Number(e.currentTarget.value))}
        disabled={bloqueado}
        aria-label={t.velocidadActual(velocidadNormalizada)}
        className="slider-volumen mb-2 h-1.75 w-full appearance-none rounded-full border border-transparent bg-white/10"
        style={estiloSliderVelocidad(velocidadNormalizada)}
      />

      {/* Presets de velocidad */}
      <div className="flex justify-between gap-1" role="group" aria-label={t.velocidad}>
        {PASOS_VELOCIDAD.map((paso) => {
          const activo = Math.abs(velocidadNormalizada - paso) < 0.01;
          return (
            <button
              key={paso}
              type="button"
              disabled={bloqueado}
              onClick={() => onCambiarVelocidad(paso)}
              className={`flex-1 rounded py-0.5 text-center text-[0.62rem] font-semibold transition-colors ${
                activo
                  ? 'bg-white/12 text-marfil/90'
                  : 'text-marfil/35 hover:bg-white/6 hover:text-marfil/70'
              } disabled:pointer-events-none disabled:opacity-40`}
              aria-pressed={activo}>
              {paso === 1 ? '1x' : `${paso}x`}
            </button>
          );
        })}
      </div>
    </section>
  );
}
