import {
  ACCIONES_REPRODUCTOR,
  MODOS_REPETICION,
  type AccionReproductor,
  type EstadoCancion,
} from '@/entities/reproductor';
import type { Textos } from '@/features/i18n';
import { BotonControl } from './BotonControl';
import { IconoControl } from './IconoControl';

type EstadoDescarga = null | 'descargando' | 'ok' | 'error';

export function ControlesReproductor(props: {
  cancion: EstadoCancion;
  bloqueado: boolean;
  t: Textos;
  estadoDescarga: EstadoDescarga;
  mostrarBotonDescarga: boolean;
  onEjecutarAccion: (accion: AccionReproductor) => Promise<void> | void;
  onDescargar: () => Promise<void> | void;
}) {
  const {
    bloqueado,
    cancion,
    estadoDescarga,
    mostrarBotonDescarga,
    onDescargar,
    onEjecutarAccion,
    t,
  } = props;

  const aleatorioActivo = cancion.aleatorioActivo;
  const repeticionListaActiva = cancion.modoRepeticion === MODOS_REPETICION.lista;
  const repeticionPistaActiva = cancion.modoRepeticion === MODOS_REPETICION.pista;
  const accionRepeticionLista = repeticionListaActiva
    ? ACCIONES_REPRODUCTOR.desactivarRepeticion
    : ACCIONES_REPRODUCTOR.establecerRepeticionLista;
  const accionRepeticionPista = repeticionPistaActiva
    ? ACCIONES_REPRODUCTOR.desactivarRepeticion
    : ACCIONES_REPRODUCTOR.establecerRepeticionPista;

  const textoDescarga =
    estadoDescarga === 'descargando'
      ? t.descargando
      : estadoDescarga === 'ok'
        ? t.descargaOk
        : estadoDescarga === 'error'
          ? t.descargaError
          : t.descargarMp3;

  const resumenReproductor = [
    cancion.titulo,
    cancion.artista || t.sinArtista,
    cancion.reproduciendo ? t.reproduciendoAhora : t.pausadoAhora,
    t.volumenActual(cancion.volumen),
  ].join('. ');

  return (
    <section className="flex flex-col gap-2">
      <p className="sr-only">{resumenReproductor}</p>

      <div
        className="grid grid-cols-3 gap-1.5"
        role="group"
        aria-label={t.controlesTransporte}>
        <BotonControl
          etiqueta={t.pistaAnterior}
          onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.cancionAnterior)}
          deshabilitado={bloqueado}>
          <IconoControl nombre="anterior" />
        </BotonControl>

        <BotonControl
          etiqueta={cancion.reproduciendo ? t.pausar : t.reproducir}
          onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarReproduccion)}
          deshabilitado={bloqueado}
          principal>
          <IconoControl
            nombre={cancion.reproduciendo ? 'pausa' : 'play'}
            className="h-5 w-5"
          />
        </BotonControl>

        <BotonControl
          etiqueta={t.siguientePista}
          onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.siguienteCancion)}
          deshabilitado={bloqueado}>
          <IconoControl nombre="siguiente" />
        </BotonControl>
      </div>

      <div
        className="grid grid-cols-5 gap-1.5"
        role="group"
        aria-label={t.opcionesReproductor}>
        <BotonModo
          activo={aleatorioActivo}
          ariaLabel={`${t.alternarAleatorio}. ${aleatorioActivo ? t.activado : t.desactivado}`}
          onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarAleatorio)}
          deshabilitado={bloqueado}>
          <IconoControl
            nombre="aleatorio"
            weight={aleatorioActivo ? 'fill' : 'regular'}
          />
        </BotonModo>

        <BotonModo
          activo={repeticionListaActiva}
          ariaLabel={`${t.alternarRepeticionLista}. ${repeticionListaActiva ? t.activado : t.desactivado}`}
          onClick={() => void onEjecutarAccion(accionRepeticionLista)}
          deshabilitado={bloqueado}>
          <IconoControl
            nombre="repetirLista"
            weight={repeticionListaActiva ? 'fill' : 'regular'}
          />
        </BotonModo>

        <BotonModo
          activo={repeticionPistaActiva}
          ariaLabel={`${t.alternarRepeticionPista}. ${repeticionPistaActiva ? t.activado : t.desactivado}`}
          onClick={() => void onEjecutarAccion(accionRepeticionPista)}
          deshabilitado={bloqueado}>
          <IconoControl
            nombre="repetirPista"
            weight={repeticionPistaActiva ? 'fill' : 'regular'}
          />
        </BotonModo>

        <BotonModo
          activo={cancion.meGustaActivo}
          variante="soft"
          ariaLabel={`${cancion.meGustaActivo ? t.quitarMeGusta : t.marcarMeGusta}. ${cancion.meGustaActivo ? t.activado : t.desactivado}`}
          onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarMeGusta)}
          deshabilitado={bloqueado}>
          <IconoControl
            nombre="corazon"
            weight={cancion.meGustaActivo ? 'fill' : 'regular'}
            className="text-current"
          />
        </BotonModo>

        <BotonModo
          activo={cancion.silenciado}
          variante="soft"
          ariaLabel={`${cancion.silenciado ? t.activarSonido : t.silenciarSonido}. ${cancion.silenciado ? t.activado : t.desactivado}`}
          onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarSilencio)}
          deshabilitado={bloqueado}>
          <IconoControl
            nombre={cancion.silenciado ? 'volumenMute' : 'volumenAlto'}
            weight={cancion.silenciado ? 'fill' : 'regular'}
          />
        </BotonModo>
      </div>

      {mostrarBotonDescarga && estadoDescarga ? (
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {textoDescarga}
        </p>
      ) : null}

      {mostrarBotonDescarga ? (
        <button
          type="button"
          className="sc-btn-download"
          data-state={estadoDescarga ?? 'idle'}
          onClick={() => void onDescargar()}
          disabled={bloqueado || estadoDescarga === 'descargando'}
          aria-busy={estadoDescarga === 'descargando'}
          aria-label={textoDescarga}>
          <IconoControl
            nombre={estadoDescarga === 'descargando' ? 'recargar' : 'descargar'}
            weight={estadoDescarga === 'descargando' ? 'regular' : estadoDescarga === 'ok' ? 'fill' : 'regular'}
            className={estadoDescarga === 'descargando' ? 'animate-spin' : undefined}
          />
          <span>{textoDescarga}</span>
        </button>
      ) : null}
    </section>
  );
}

/**
 * Botón de modo (toggle) reutilizado en el segundo bloque de controles.
 * Toda la apariencia (estado activo, hover, etc.) vive en `.sc-btn-mode`.
 */
function BotonModo(props: {
  activo: boolean;
  ariaLabel: string;
  onClick: () => void;
  deshabilitado: boolean;
  variante?: 'default' | 'soft';
  children: React.ReactNode;
}) {
  const { activo, ariaLabel, children, deshabilitado, onClick, variante = 'default' } = props;

  return (
    <button
      type="button"
      className="sc-btn-mode"
      data-active={activo ? 'true' : 'false'}
      data-variant={variante}
      onClick={onClick}
      disabled={deshabilitado}
      aria-pressed={activo}
      aria-label={ariaLabel}>
      {children}
    </button>
  );
}
