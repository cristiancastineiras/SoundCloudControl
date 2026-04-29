import type { ReactNode } from 'react';
import { unirClases } from '../utilidades';

const CLASES_BASE =
  'inline-flex min-h-12 items-center justify-center rounded-[18px] border border-white/12 px-2.5 text-marfil backdrop-blur-md transition duration-150 ease-out hover:-translate-y-px hover:border-[#ffc28c]/60 disabled:cursor-wait disabled:opacity-65';

export function BotonControl(props: {
  etiqueta: string;
  onClick: () => void;
  deshabilitado: boolean;
  principal?: boolean;
  children: ReactNode;
}) {
  const { children, deshabilitado, etiqueta, onClick, principal = false } = props;

  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      disabled={deshabilitado}
      className={unirClases(
        CLASES_BASE,
        principal
          ? 'bg-[linear-gradient(135deg,#ff6a00_0%,#ff8b2f_100%)] text-[#140800]'
          : 'bg-black/70',
      )}>
      {children}
    </button>
  );
}