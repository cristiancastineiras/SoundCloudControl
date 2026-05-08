import type { EstadoCancion, RespuestaPopup } from '../../../lib/contratos';
import type { Textos } from '../i18n';
import { mensajeSecundario, unirClases } from '../utilidades';
import { BotonSeguirArtista } from './BotonSeguirArtista';

export function BloqueCancion(props: {
  cancion: EstadoCancion | null;
  respuesta: RespuestaPopup;
  bloqueado: boolean;
  t: Textos;
  onAbrirEnlace: (url: string | null) => Promise<void> | void;
  onAlternarSeguimientoArtista: () => Promise<void> | void;
}) {
  const {
    bloqueado,
    cancion,
    onAbrirEnlace,
    onAlternarSeguimientoArtista,
    respuesta,
    t,
  } = props;
  const detalleEstado = mensajeSecundario(respuesta);

  return (
    <section
      className="flex flex-1 flex-col justify-end gap-2"
      aria-labelledby="sc-current-track-heading">
      <h2 id="sc-current-track-heading" className="sr-only">{t.reproductorActual}</h2>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={unirClases(
            'sc-meta-pill self-start px-2 py-1.25 text-[0.76rem] font-bold tracking-[0.08em] uppercase',
          )}
          onClick={() => {
            void onAbrirEnlace(cancion?.urlArtista ?? null);
          }}
          disabled={!cancion?.urlArtista || bloqueado}
          aria-label={cancion?.artista ? t.abrirPaginaArtista(cancion.artista) : t.sinArtista}
          title={cancion?.artista ?? t.sinArtista}>
          {cancion?.artista ?? 'SoundCloud'}
        </button>

        {cancion?.puedeSeguirArtista ? (
          <BotonSeguirArtista
            artista={cancion.artista || t.sinArtista}
            siguiendo={cancion.siguiendoArtista}
            bloqueado={bloqueado}
            t={t}
            onClick={() => {
              void onAlternarSeguimientoArtista();
            }}
          />
        ) : null}
      </div>

      <button
        type="button"
        className={unirClases(
          'sc-meta-pill self-start px-2.5 py-2 font-geist text-[1.52rem] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance',
        )}
        onClick={() => {
          void onAbrirEnlace(cancion?.urlCancion ?? null);
        }}
        disabled={!cancion?.urlCancion || bloqueado}
        aria-label={cancion?.titulo ? t.abrirPaginaCancion(cancion.titulo) : respuesta.mensaje}
        title={cancion?.titulo ?? respuesta.mensaje}>
        {cancion?.titulo ?? respuesta.mensaje}
      </button>

      {detalleEstado ? (
        <p className="m-0 max-w-62.5 text-[0.8rem] leading-[1.35] text-marfil/82">
          {detalleEstado}
        </p>
      ) : null}
    </section>
  );
}
