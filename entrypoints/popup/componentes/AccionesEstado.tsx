import type { Textos } from '../i18n';
import { IconoControl } from './IconoControl';

export function AccionesEstado(props: {
  bloqueado: boolean;
  t: Textos;
  onAbrirSoundCloud: () => Promise<void> | void;
  onRecargar: () => Promise<void> | void;
}) {
  const { bloqueado, onAbrirSoundCloud, onRecargar, t } = props;
  const estiloBotonPrincipal = {
    backgroundImage:
      'linear-gradient(135deg, rgb(var(--sc-theme-rgb) / 0.92) 0%, rgb(var(--sc-theme-rgb) / 0.62) 100%)',
  };

  return (
    <section aria-label={t.accionesDisponibles} className="grid grid-cols-2 gap-2">
      <button
        type="button"
        className="inline-flex min-h-11.5 items-center justify-center gap-1.5 rounded-[14px] border border-white/12 bg-[linear-gradient(135deg,#ff5f00_0%,#ff8f32_100%)] px-3 text-[0.9rem] font-semibold text-marfil transition duration-150 ease-out hover:-translate-y-px hover:border-[#ffc28c]/60 disabled:cursor-wait disabled:opacity-65"
        style={estiloBotonPrincipal}
        onClick={() => {
          void onAbrirSoundCloud();
        }}
        disabled={bloqueado}>
        <IconoControl nombre="abrir" weight="bold" className="h-4.5 w-4.5" />
        {t.abrirSoundCloud}
      </button>

      <button
        type="button"
        className="inline-flex min-h-11.5 items-center justify-center gap-1.5 rounded-[14px] border border-white/12 bg-black/72 px-3 text-[0.9rem] font-semibold text-marfil transition duration-150 ease-out hover:-translate-y-px hover:border-[#ffc28c]/60 disabled:cursor-wait disabled:opacity-65"
        onClick={() => {
          void onRecargar();
        }}
        disabled={bloqueado}>
        <IconoControl nombre="recargar" weight="bold" className="h-4.5 w-4.5" />
        {t.reintentar}
      </button>
    </section>
  );
}