import type { Textos } from '../i18n';
import { IconoControl } from './IconoControl';

export function AccionesEstado(props: {
  bloqueado: boolean;
  t: Textos;
  onAbrirSoundCloud: () => Promise<void> | void;
  onRecargar: () => Promise<void> | void;
}) {
  const { bloqueado, onAbrirSoundCloud, onRecargar, t } = props;

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
