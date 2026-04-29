import type { RespuestaPopup } from '../../../lib/contratos';

export function CabeceraPopup(props: { respuesta: RespuestaPopup }) {


  return (
    <header className="flex items-start justify-between gap-2.5">
      <div>
        <p className="m-0 text-[0.64rem] font-semibold tracking-[0.18em] text-ambar-100">
          SOUNDCLOUD CONTROL
        </p>
      </div>

    </header>
  );
}