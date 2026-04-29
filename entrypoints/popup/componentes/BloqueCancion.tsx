import type { EstadoCancion, RespuestaPopup } from '../../../lib/contratos';
import { mensajeSecundario, unirClases } from '../utilidades';

const CLASES_META =
  'inline-flex max-w-full self-start rounded-[4px] border border-white/10 bg-black/75 text-left text-marfil transition duration-150 ease-out hover:-translate-y-px hover:border-[#ffaa72]/50 hover:bg-ascua-500/20 disabled:cursor-default disabled:opacity-95';

export function BloqueCancion(props: {
  cancion: EstadoCancion | null;
  respuesta: RespuestaPopup;
  bloqueado: boolean;
  onAbrirEnlace: (url: string | null) => Promise<void> | void;
}) {
  const { bloqueado, cancion, onAbrirEnlace, respuesta } = props;

  return (
    <section className="flex flex-1 flex-col justify-end gap-2">
      <button
        type="button"
        className={unirClases(
          CLASES_META,
          'px-2 py-1.25 text-[0.76rem] font-bold tracking-[0.08em] uppercase',
        )}
        onClick={() => {
          void onAbrirEnlace(cancion?.urlArtista ?? null);
        }}
        disabled={!cancion?.urlArtista || bloqueado}
        title={cancion?.artista ?? 'Sin artista disponible'}>
        {cancion?.artista ?? 'SoundCloud'}
      </button>

      <button
        type="button"
        className={unirClases(
          CLASES_META,
          'px-2.5 py-2 font-manrope text-[1.52rem] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance',
        )}
        onClick={() => {
          void onAbrirEnlace(cancion?.urlCancion ?? null);
        }}
        disabled={!cancion?.urlCancion || bloqueado}
        title={cancion?.titulo ?? respuesta.mensaje}>
        {cancion?.titulo ?? respuesta.mensaje}
      </button>

      <p className="m-0 max-w-62.5 text-[0.8rem] leading-[1.35] text-[rgba(255,244,234,0.82)]">
        {mensajeSecundario(respuesta)}
      </p>
    </section>
  );
}