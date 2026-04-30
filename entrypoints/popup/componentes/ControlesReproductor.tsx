import {
  ACCIONES_REPRODUCTOR,
  MODOS_REPETICION,
  type AccionReproductor,
  type EstadoCancion,
} from '../../../lib/contratos';
import type { Textos } from '../i18n';
import { unirClases } from '../utilidades';
import { BotonControl } from './BotonControl';
import { IconoControl } from './IconoControl';

export function ControlesReproductor(props: {
  cancion: EstadoCancion;
  bloqueado: boolean;
  t: Textos;
  onEjecutarAccion: (accion: AccionReproductor) => Promise<void> | void;
}) {
  const { bloqueado, cancion, onEjecutarAccion, t } = props;
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
  const estiloBotonActivo = {
    borderColor: 'rgb(var(--sc-theme-rgb) / 0.72)',
    backgroundImage:
      'linear-gradient(180deg, rgb(var(--sc-theme-rgb) / 0.34), rgb(var(--sc-theme-rgb) / 0.16))',
    boxShadow:
      '0 0 0 1px rgb(var(--sc-theme-rgb) / 0.24), 0 10px 24px rgb(var(--sc-theme-rgb) / 0.18)',
    color: '#fff2e8',
  };
  const estiloEstadoActivo = {
    borderColor: 'rgb(var(--sc-theme-rgb) / 0.58)',
    backgroundColor: 'rgb(var(--sc-theme-rgb) / 0.20)',
    color: '#fff7f1',
  };
  const clasesBotonModo = (activo: boolean) =>
    unirClases(
      clasesBotonSecundario,
      'relative overflow-hidden',
      activo
        ? 'text-[#ffe2c3]'
        : 'bg-black/72 text-marfil/78',
    );

  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t.appNombre}>
        <BotonControl
          etiqueta={t.pistaAnterior}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.cancionAnterior);
          }}
          deshabilitado={bloqueado}>
          <IconoControl nombre="anterior" />
        </BotonControl>

        <BotonControl
          etiqueta={cancion.reproduciendo ? t.pausar : t.reproducir}
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
          etiqueta={t.siguientePista}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.siguienteCancion);
          }}
          deshabilitado={bloqueado}>
          <IconoControl nombre="siguiente" />
        </BotonControl>
      </div>

      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={t.appNombre}>
        <button
          type="button"
          className={clasesBotonModo(aleatorioActivo)}
          style={aleatorioActivo ? estiloBotonActivo : undefined}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarAleatorio);
          }}
          disabled={bloqueado}
          aria-pressed={aleatorioActivo}
          aria-label={t.alternarAleatorio}>
          <IconoControl nombre="aleatorio" weight={aleatorioActivo ? 'fill' : 'regular'} />
          
        </button>

        <button
          type="button"
          className={clasesBotonModo(repeticionListaActiva)}
          style={repeticionListaActiva ? estiloBotonActivo : undefined}
          onClick={() => {
            void onEjecutarAccion(accionRepeticionLista);
          }}
          disabled={bloqueado}
          aria-pressed={repeticionListaActiva}
          aria-label={t.alternarRepeticionLista}>
          <IconoControl
            nombre="repetirLista"
            weight={repeticionListaActiva ? 'fill' : 'regular'}
          />
          
        </button>

        <button
          type="button"
          className={clasesBotonModo(repeticionPistaActiva)}
          style={repeticionPistaActiva ? estiloBotonActivo : undefined}
          onClick={() => {
            void onEjecutarAccion(accionRepeticionPista);
          }}
          disabled={bloqueado}
          aria-pressed={repeticionPistaActiva}
          aria-label={t.alternarRepeticionPista}>
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
              ? ''
              : 'bg-black/72',
          )}
          style={cancion.meGustaActivo ? estiloEstadoActivo : undefined}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarMeGusta);
          }}
          disabled={bloqueado}
          aria-pressed={cancion.meGustaActivo}
          aria-label={cancion.meGustaActivo ? t.quitarMeGusta : t.marcarMeGusta}>
          <IconoControl
            nombre="corazon"
            weight={cancion.meGustaActivo ? 'fill' : 'regular'}
            className="text-current"
          />
        </button>

        <button
          type="button"
          className={unirClases(
            clasesBotonSecundario,
            cancion.silenciado ? '' : 'bg-black/72',
          )}
          style={cancion.silenciado ? estiloEstadoActivo : undefined}
          onClick={() => {
            void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarSilencio);
          }}
          disabled={bloqueado}
          aria-pressed={cancion.silenciado}
          aria-label={cancion.silenciado ? t.activarSonido : t.silenciarSonido}>
          <IconoControl
            nombre={cancion.silenciado ? 'volumenMute' : 'volumenAlto'}
            weight={cancion.silenciado ? 'fill' : 'regular'}
          />
        </button>
      </div>
    </section>
  );
}