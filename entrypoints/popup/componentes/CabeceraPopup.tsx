import { GearSix, SlidersHorizontal } from '@phosphor-icons/react';
import type { ReactNode, Ref } from 'react';
import type { RespuestaPopup } from '../../../lib/contratos';
import type { Textos } from '../i18n';

export function CabeceraPopup(props: {
  respuesta: RespuestaPopup;
  t: Textos;
  buttonRef?: Ref<HTMLButtonElement>;
  equalizerButtonRef?: Ref<HTMLButtonElement>;
  ajustesAbiertos: boolean;
  equalizadorAbierto: boolean;
  panelAjustesId: string;
  panelEqualizadorId: string;
  onAbrirAjustes: () => void;
  onAbrirEqualizador: () => void;
}) {
  const {
    ajustesAbiertos,
    buttonRef,
    equalizadorAbierto,
    equalizerButtonRef,
    onAbrirAjustes,
    onAbrirEqualizador,
    panelAjustesId,
    panelEqualizadorId,
    t,
  } = props;

  return (
    <header className="flex items-center justify-end gap-2">
      <BotonCabecera
        ariaLabel={t.abrirEqualizador}
        buttonRef={equalizerButtonRef}
        expanded={equalizadorAbierto}
        controls={panelEqualizadorId}
        onClick={onAbrirEqualizador}>
        <SlidersHorizontal size={16} weight="bold" />
      </BotonCabecera>

      <BotonCabecera
        ariaLabel={t.abrirAjustes}
        buttonRef={buttonRef}
        expanded={ajustesAbiertos}
        controls={panelAjustesId}
        onClick={onAbrirAjustes}>
        <GearSix size={16} weight="bold" />
      </BotonCabecera>
    </header>
  );
}

function BotonCabecera(props: {
  ariaLabel: string;
  children: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      ref={props.buttonRef}
      aria-label={props.ariaLabel}
      aria-expanded={props.expanded}
      aria-controls={props.controls}
      onClick={props.onClick}
      className="sc-btn-icon">
      {props.children}
    </button>
  );
}
