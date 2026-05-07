import type { Textos } from '../i18n';
import { IconoControl } from './IconoControl';

export function AccionesEstado(props: {
  bloqueado: boolean;
  t: Textos;
  compacto?: boolean;
  onAbrirSoundCloud: () => Promise<void> | void;
  onRecargar: () => Promise<void> | void;
}) {
  const { bloqueado, compacto, onAbrirSoundCloud, onRecargar, t } = props;

  if (compacto) {
    return (
      <section
        aria-label={t.accionesDisponibles}
        className="flex items-center gap-1.5 mt-1">
        <button
          type="button"
          className="sc-btn-soft flex-1 gap-1 px-2 py-1 text-[0.7rem]"
          style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--sc-theme-rgb) / 0.85) 0%, rgb(var(--sc-theme-rgb) / 0.55) 100%)', color: '#140800', borderColor: 'rgb(var(--sc-theme-rgb) / 0.4)' }}
          onClick={() => void onAbrirSoundCloud()}
          disabled={bloqueado}>
          <IconoControl nombre="abrir" weight="bold" className="h-3 w-3 flex-none" />
          {t.abrirSoundCloud}
        </button>
        <button
          type="button"
          className="sc-btn-soft gap-1 px-2 py-1 text-[0.7rem]"
          onClick={() => void onRecargar()}
          disabled={bloqueado}>
          <IconoControl nombre="recargar" weight="bold" className="h-3 w-3 flex-none" />
          {t.reintentar}
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label={t.accionesDisponibles}
      className="grid grid-cols-2 gap-2">
      <button
        type="button"
        className="sc-btn sc-btn-primary gap-1.5 px-3 text-[0.9rem] font-semibold"
        onClick={() => void onAbrirSoundCloud()}
        disabled={bloqueado}>
        <IconoControl nombre="abrir" weight="bold" className="h-4.5 w-4.5" />
        {t.abrirSoundCloud}
      </button>

      <button
        type="button"
        className="sc-btn gap-1.5 px-3 text-[0.9rem] font-semibold"
        onClick={() => void onRecargar()}
        disabled={bloqueado}>
        <IconoControl nombre="recargar" weight="bold" className="h-4.5 w-4.5" />
        {t.reintentar}
      </button>
    </section>
  );
}
