import { useEffect, useState } from 'react';
import {
  type AccionReproductor,
  type RespuestaPopup,
  type SolicitudPopup,
} from '../../lib/contratos';
import { obtenerImagenGrande } from '../../lib/soundcloud';
import { AccionesEstado } from './componentes/AccionesEstado';
import { BloqueCancion } from './componentes/BloqueCancion';
import { CabeceraPopup } from './componentes/CabeceraPopup';
import { ControlesReproductor } from './componentes/ControlesReproductor';
import { FondoPortada } from './componentes/FondoPortada';
import { descripcionPortada } from './utilidades';

const ESTADO_INICIAL: RespuestaPopup = {
  estadoVista: 'cargando',
  cancion: null,
  mensaje: 'Buscando una pestaña de SoundCloud...',
};

type AccionInterfaz = AccionReproductor | 'abrir-soundcloud' | 'abrir-enlace';

function AplicacionPopup() {
  const [respuesta, setRespuesta] = useState<RespuestaPopup>(ESTADO_INICIAL);
  const [accionEnCurso, setAccionEnCurso] = useState<AccionInterfaz | null>(null);

  useEffect(() => {
    void cargarEstado();

    const intervalo = window.setInterval(() => {
      void cargarEstado(true);
    }, 4_000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  const cancion = respuesta.cancion;
  const portada = obtenerImagenGrande(cancion?.urlImagen ?? null);
  const controlesBloqueados =
    accionEnCurso !== null || respuesta.estadoVista !== 'disponible';

  async function cargarEstado(silencioso = false) {
    if (!silencioso) {
      setRespuesta((estadoActual) =>
        estadoActual.estadoVista === 'disponible' ? estadoActual : ESTADO_INICIAL,
      );
    }

    try {
      const siguienteEstado = await enviarMensaje({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'obtener-estado',
      });
      setRespuesta(siguienteEstado);
    } catch {
      setRespuesta({
        estadoVista: 'error',
        cancion: null,
        mensaje: 'No se ha podido comunicar el popup con el background.',
      });
    }
  }

  async function ejecutarAccion(accion: AccionReproductor) {
    setAccionEnCurso(accion);

    try {
      const siguienteEstado = await enviarMensaje({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'ejecutar-accion',
        accion,
      });
      setRespuesta(siguienteEstado);
    } catch {
      setRespuesta({
        estadoVista: 'error',
        cancion: null,
        mensaje: 'La acción no se ha podido completar correctamente.',
      });
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function abrirSoundCloud() {
    setAccionEnCurso('abrir-soundcloud');

    try {
      await enviarMensaje({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'abrir-soundcloud',
      });
      window.close();
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function abrirEnlace(url: string | null) {
    if (!url) {
      return;
    }

    setAccionEnCurso('abrir-enlace');

    try {
      await enviarMensaje({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'abrir-enlace',
        url,
      });
      window.close();
    } finally {
      setAccionEnCurso(null);
    }
  }

  return (
    <main className="relative w-78">
      <section className="fondo-tarjeta sombra-tarjeta relative overflow-hidden rounded-[22px] border border-white/10">
        <div className="h-1.25 w-full bg-[linear-gradient(90deg,#ff5500_0%,#ff7700_62%,#ffd08a_100%)]" />
        <FondoPortada portada={portada} descripcion={descripcionPortada(cancion)} />

        <div className="relative z-10 flex min-h-97.75 flex-col gap-4 px-4 pb-4 pt-4.5">
          <CabeceraPopup respuesta={respuesta} />

          <BloqueCancion
            cancion={cancion}
            respuesta={respuesta}
            bloqueado={accionEnCurso !== null}
            onAbrirEnlace={abrirEnlace}
          />

          {respuesta.estadoVista === 'disponible' && cancion ? (
            <ControlesReproductor
              cancion={cancion}
              bloqueado={controlesBloqueados}
              onEjecutarAccion={ejecutarAccion}
            />
          ) : (
            <AccionesEstado
              bloqueado={accionEnCurso !== null}
              onAbrirSoundCloud={abrirSoundCloud}
              onRecargar={async () => {
                await cargarEstado();
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}

async function enviarMensaje(mensaje: SolicitudPopup) {
  return (await browser.runtime.sendMessage(mensaje)) as RespuestaPopup;
}

export default AplicacionPopup;
