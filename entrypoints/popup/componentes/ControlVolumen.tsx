import type { CSSProperties } from 'react';
import type { Textos } from '@/features/i18n';
import { IconoControl } from './IconoControl';

export function ControlVolumen(props: {
  volumen: number;
  silenciado: boolean;
  bloqueado: boolean;
  compacto?: boolean;
  t: Textos;
  onCambiarVolumen: (volumen: number) => void;
}) {
  const {
    bloqueado,
    compacto = false,
    onCambiarVolumen,
    silenciado,
    t,
    volumen: volumenEntrada,
  } = props;

  const volumen = normalizarVolumen(volumenEntrada);
  const tituloId = compacto ? 'sc-volume-title-compact' : 'sc-volume-title';
  const descripcion = t.volumenActual(volumen);

  if (compacto) {
    return (
      <div className="flex items-center gap-3" role="group" aria-labelledby={tituloId}>
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/8 bg-white/4 text-marfil/60"
          aria-hidden="true">
          <IconoControl
            nombre={silenciado || volumen === 0 ? 'volumenMute' : 'volumenAlto'}
            weight={silenciado || volumen === 0 ? 'fill' : 'regular'}
            className="h-4 w-4"
          />
        </span>

        <div className="min-w-0 flex-1">
          <span id={tituloId} className="sr-only">{t.volumen}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={volumen}
            onChange={(event) => onCambiarVolumen(Number(event.currentTarget.value))}
            disabled={bloqueado}
            aria-label={descripcion}
            className="slider-volumen h-1.75 w-full appearance-none rounded-full border border-transparent bg-white/10"
            style={estiloSliderVolumen(volumen)}
          />
        </div>

        <span className="min-w-11 text-right font-mono text-[0.72rem] font-semibold text-marfil/65">
          {volumen}%
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
            <IconoControl
              nombre={silenciado || volumen === 0 ? 'volumenMute' : 'volumenAlto'}
              weight={silenciado || volumen === 0 ? 'fill' : 'regular'}
            />
          </span>

          <div className="min-w-0">
            <h3 id={tituloId} className="sc-section-title">{t.volumen}</h3>
            <p className="m-0 text-[0.74rem] text-marfil/45">{descripcion}</p>
          </div>
        </div>

        <span className="flex-none font-mono text-[0.82rem] font-semibold text-marfil/80">
          {volumen}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={volumen}
        onChange={(event) => onCambiarVolumen(Number(event.currentTarget.value))}
        disabled={bloqueado}
        aria-label={descripcion}
        className="slider-volumen h-2 w-full appearance-none rounded-full border border-transparent bg-white/10"
        style={estiloSliderVolumen(volumen)}
      />
    </section>
  );
}

function normalizarVolumen(valor: number) {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(100, Math.round(valor)));
}

function estiloSliderVolumen(valor: number): CSSProperties {
  const progreso = normalizarVolumen(valor);

  return {
    backgroundImage: `linear-gradient(90deg, rgb(var(--sc-theme-rgb) / 0.92) 0%, rgb(var(--sc-theme-rgb) / 0.92) ${progreso}%, rgba(255, 255, 255, 0.12) ${progreso}%, rgba(255, 255, 255, 0.12) 100%)`,
  };
}