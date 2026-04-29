import {
  ACCIONES_REPRODUCTOR,
  MODOS_REPETICION,
  type AccionReproductor,
  type EstadoCancion,
} from '../../../lib/contratos';
import { unirClases } from '../utilidades';
import { BotonControl } from './BotonControl';
import { IconoControl } from './IconoControl';

export function ControlesReproductor(props: {
  cancion: EstadoCancion;
  bloqueado: boolean;
  onEjecutarAccion: (accion: AccionReproductor) => Promise<void> | void;
}) {
  const { bloqueado, cancion, onEjecutarAccion } = props;
  const aleatorioActivo = cancion.aleatorioActivo;
  const repeticionListaActiva = cancion.modoRepeticion === MODOS_REPETICION.lista;
  const repeticionPistaActiva = cancion.modoRepeticion === MODOS_REPETICION.pista;
  const accionRepeticionLista =
    repeticionListaActiva
      ? ACCIONES_REPRODUCTOR.desactivarRepeticion
      : ACCIONES_REPRODUCTOR.establecerRepeticionLista;
  const accionRepeticionPista =
    repeticionPistaActiva
      ? ACCIONES_REPRODUCTOR.desactivarRepeticion
      : ACCIONES_REPRODUCTOR.establecerRepeticionPista;
  const clasesBotonSecundario =
    'inline-flex h-10 items-center justify-center rounded-[16px] border border-white/12 bg-black/72 text-marfil transition duration-150 ease-out hover:-translate-y-px hover:border-[#ffc28c]/60 disabled:cursor-wait disabled:opacity-65';
  const clasesBotonModo = (activo: boolean) =>
    unirClases(
      clasesBotonSecundario,
      'relative overflow-hidden',
      activo
        ? 'border-[#ffc28c]/85 bg-[linear-gradient(180deg,rgba(255,119,0,0.34),rgba(255,119,0,0.16))] text-[#ffe2c3] shadow-[0_0_0_1px_rgba(255,194,140,0.24),0_10px_24px_rgba(255,119,0,0.18)]'
        : 'bg-black/72 text-marfil/78',
    );

  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Controles de reproducción">
        <BotonControl
          etiqueta="Pista anterior"
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.cancionAnterior);
          }}
          deshabilitado={bloqueado}>
          <IconoControl nombre="anterior" />
        </BotonControl>

        <BotonControl
          etiqueta={cancion.reproduciendo ? 'Pausar' : 'Reproducir'}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarReproduccion);
          }}
          deshabilitado={bloqueado}
          principal>
          <IconoControl
            nombre={cancion.reproduciendo ? 'pausa' : 'play'}
            className="h-5 w-5"
          />
        </BotonControl>

        <BotonControl
          etiqueta="Siguiente pista"
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.siguienteCancion);
          }}
          deshabilitado={bloqueado}>
          <IconoControl nombre="siguiente" />
        </BotonControl>
      </div>

      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Controles avanzados">
        <button
          type="button"
          className={clasesBotonModo(aleatorioActivo)}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarAleatorio);
          }}
          disabled={bloqueado}
          aria-pressed={aleatorioActivo}
          aria-label="Alternar modo aleatorio">
          <IconoControl nombre="aleatorio" weight={aleatorioActivo ? 'fill' : 'regular'} />
          
        </button>

        <button
          type="button"
          className={clasesBotonModo(repeticionListaActiva)}
          onClick={() => {
            void onEjecutarAccion(accionRepeticionLista);
          }}
          disabled={bloqueado}
          aria-pressed={repeticionListaActiva}
          aria-label="Alternar repetición de lista">
          <IconoControl
            nombre="repetirLista"
            weight={repeticionListaActiva ? 'fill' : 'regular'}
          />
          
        </button>

        <button
          type="button"
          className={clasesBotonModo(repeticionPistaActiva)}
          onClick={() => {
            void onEjecutarAccion(accionRepeticionPista);
          }}
          disabled={bloqueado}
          aria-pressed={repeticionPistaActiva}
          aria-label="Alternar repetición de pista">
          <IconoControl
            nombre="repetirPista"
            weight={repeticionPistaActiva ? 'fill' : 'regular'}
          />
          
        </button>

        <button
          type="button"
          className={unirClases(
            clasesBotonSecundario,
            cancion.meGustaActivo
              ? 'bg-ascua-500/20 text-[#ff9f53]'
              : 'bg-black/72',
          )}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarMeGusta);
          }}
          disabled={bloqueado}
          aria-pressed={cancion.meGustaActivo}
          aria-label={cancion.meGustaActivo ? 'Quitar me gusta' : 'Marcar me gusta'}>
          <IconoControl
            nombre="corazon"
            weight={cancion.meGustaActivo ? 'fill' : 'regular'}
            className={cancion.meGustaActivo ? 'text-[#ff6a00]' : 'text-marfil'}
          />
        </button>

        <button
          type="button"
          className={unirClases(
            clasesBotonSecundario,
            cancion.silenciado ? 'bg-ascua-500/18 text-[#ffb06d]' : 'bg-black/72',
          )}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarSilencio);
          }}
          disabled={bloqueado}
          aria-pressed={cancion.silenciado}
          aria-label={cancion.silenciado ? 'Activar sonido' : 'Silenciar sonido'}>
          <IconoControl
            nombre={cancion.silenciado ? 'volumenMute' : 'volumenAlto'}
            weight={cancion.silenciado ? 'fill' : 'regular'}
          />
        </button>
      </div>
    </section>
  );
}