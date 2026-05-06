import type { ReactNode } from 'react';
import { unirClases } from '../utilidades';

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
      className={unirClases('sc-btn', principal && 'sc-btn-primary')}>
      {children}
    </button>
  );
}
