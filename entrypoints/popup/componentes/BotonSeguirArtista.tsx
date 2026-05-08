import type { Textos } from '../i18n';
import { unirClases } from '../utilidades';
import { IconoControl } from './IconoControl';

export function BotonSeguirArtista(props: {
  artista: string;
  siguiendo: boolean;
  bloqueado: boolean;
  compacto?: boolean;
  t: Textos;
  onClick: () => void;
}) {
  const { artista, bloqueado, compacto = false, onClick, siguiendo, t } = props;
  const etiqueta = t.etiquetaSeguimientoArtista(artista, siguiendo);
  const texto = siguiendo ? t.siguiendoArtista : t.seguirArtista;

  return (
    <button
      type="button"
      className={unirClases(
        'sc-meta-pill inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:opacity-55',
        compacto ? 'max-w-26 px-2 py-1 text-[0.62rem]' : 'self-start px-2 py-1.25 text-[0.72rem]',
        siguiendo ? 'text-marfil/82' : 'text-marfil/62',
      )}
      onClick={onClick}
      disabled={bloqueado}
      aria-label={etiqueta}
      aria-pressed={siguiendo}
      title={etiqueta}>
      <IconoControl
        nombre={siguiendo ? 'siguiendo' : 'seguir'}
        weight={siguiendo ? 'fill' : 'regular'}
        className={compacto ? 'h-3.25 w-3.25' : 'h-3.75 w-3.75'}
      />
      <span className="truncate">{texto}</span>
    </button>
  );
}