import type { RespuestaPopup } from '../../../lib/contratos';
import type { Textos } from '../i18n';
import { BotonAjustes } from './PantallaAjustes';

export function CabeceraPopup(props: {
  respuesta: RespuestaPopup;
  t: Textos;
  onAbrirAjustes: () => void;
}) {
  const { onAbrirAjustes, t } = props;

  return (
    <header className="">
      {/* <div>
        <p className="m-0 text-[0.64rem] font-semibold tracking-[0.18em] text-ambar-100/70 uppercase">
          {t.appNombre}
        </p>
      </div> */}
      <BotonAjustes t={t} onClick={onAbrirAjustes} />
    </header>
  );
}