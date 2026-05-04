import type { RespuestaPopup } from '../../../lib/contratos';
import type { Ref } from 'react';
import type { Textos } from '../i18n';
import { BotonAjustes } from './PantallaAjustes';

export function CabeceraPopup(props: {
  respuesta: RespuestaPopup;
  t: Textos;
  buttonRef?: Ref<HTMLButtonElement>;
  ajustesAbiertos: boolean;
  panelAjustesId: string;
  onAbrirAjustes: () => void;
}) {
  const { ajustesAbiertos, buttonRef, onAbrirAjustes, panelAjustesId, t } = props;

  return (
    <header className="flex items-center justify-between gap-3">
      
      <BotonAjustes
        t={t}
        buttonRef={buttonRef}
        expanded={ajustesAbiertos}
        controls={panelAjustesId}
        onClick={onAbrirAjustes}
      />
    </header>
  );
}