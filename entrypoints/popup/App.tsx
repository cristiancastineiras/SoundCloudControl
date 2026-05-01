import { useEffect, useState, type CSSProperties } from 'react';
import {
  type AccionReproductor,
  type RespuestaDescarga,
  type RespuestaPopup,
  type SolicitudPopup,
} from '../../lib/contratos';
import { obtenerImagenGrande } from '../../lib/soundcloud';
import {
  type Idioma,
  TEXTOS,
  guardarIdioma,
  obtenerIdioma,
} from './i18n';
import { AccionesEstado } from './componentes/AccionesEstado';
import { BloqueCancion } from './componentes/BloqueCancion';
import { CabeceraPopup } from './componentes/CabeceraPopup';
import { ControlesReproductor } from './componentes/ControlesReproductor';
import { FondoPortada } from './componentes/FondoPortada';
import { PantallaAjustes } from './componentes/PantallaAjustes';
import { descripcionPortada } from './utilidades';

const CLAVE_INTERVALO = 'sc-control-intervalo';
const CLAVE_TEMA = 'sc-control-tema';
const ALTURA_POPUP = 391;
const COLOR_TEMA_POR_DEFECTO = '#ff7700';

type Rgb = { r: number; g: number; b: number };

function leerIntervalo(): number {
  try {
    const v = localStorage.getItem(CLAVE_INTERVALO);
    const n = Number(v);
    return [2000, 4000, 8000].includes(n) ? n : 4000;
  } catch {
    return 4000;
  }
}

function normalizarColorTema(valor: string | null | undefined): string {
  if (valor === 'naranja') {
    return COLOR_TEMA_POR_DEFECTO;
  }

  if (typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor)) {
    return valor.toLowerCase();
  }

  return COLOR_TEMA_POR_DEFECTO;
}

function leerColorTema(): string {
  try {
    return normalizarColorTema(localStorage.getItem(CLAVE_TEMA));
  } catch {
    return COLOR_TEMA_POR_DEFECTO;
  }
}

function guardarColorTema(color: string) {
  try {
    localStorage.setItem(CLAVE_TEMA, normalizarColorTema(color));
  } catch {
    // sin acceso a localStorage
  }
}

function hexARgb(hex: string): Rgb {
  const valor = normalizarColorTema(hex).slice(1);

  return {
    r: Number.parseInt(valor.slice(0, 2), 16),
    g: Number.parseInt(valor.slice(2, 4), 16),
    b: Number.parseInt(valor.slice(4, 6), 16),
  };
}

function mezclarConBlanco(hex: string, factor: number): string {
  const rgb = hexARgb(hex);
  const mezcla = (canal: number) => {
    const proporcion = Math.max(0, Math.min(1, factor));
    return Math.round(canal + (255 - canal) * proporcion)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${mezcla(rgb.r)}${mezcla(rgb.g)}${mezcla(rgb.b)}`;
}

function rgbaDesdeRgb(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

type Vista = 'principal' | 'ajustes';
type AccionInterfaz = AccionReproductor | 'abrir-soundcloud' | 'abrir-enlace';
type EstadoDescarga = null | 'descargando' | 'ok' | 'error';

function AplicacionPopup() {
  const [idioma, setIdioma] = useState<Idioma>(obtenerIdioma);
  const [vista, setVista] = useState<Vista>('principal');
  const [colorTema, setColorTema] = useState(leerColorTema);
  const [respuesta, setRespuesta] = useState<RespuestaPopup>(() => ({
    estadoVista: 'cargando',
    cancion: null,
    mensaje: TEXTOS[obtenerIdioma()].cargando,
  }));
  const [accionEnCurso, setAccionEnCurso] = useState<AccionInterfaz | null>(null);
  const [estadoDescarga, setEstadoDescarga] = useState<EstadoDescarga>(null);

  const t = TEXTOS[idioma];

  useEffect(() => {
    void cargarEstado();

    const intervalo = window.setInterval(() => {
      void cargarEstado(true);
    }, leerIntervalo());

    return () => {
      window.clearInterval(intervalo);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancion = respuesta.cancion;
  const portada = obtenerImagenGrande(cancion?.urlImagen ?? null);
  const rgbTema = hexARgb(colorTema);
  const controlesBloqueados =
    accionEnCurso !== null || respuesta.estadoVista !== 'disponible';
  const estiloTarjeta = {
    background: `radial-gradient(circle at top left, ${rgbaDesdeRgb(rgbTema, 0.32)}, transparent 32%), linear-gradient(145deg, #121212 0%, #050505 58%, #19130f 100%)`,
    ['--sc-theme-rgb' as string]: `${rgbTema.r} ${rgbTema.g} ${rgbTema.b}`,
  } as CSSProperties;
  const estiloBarraTema: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${mezclarConBlanco(colorTema, 0.04)} 0%, ${mezclarConBlanco(colorTema, 0.18)} 62%, ${mezclarConBlanco(colorTema, 0.56)} 100%)`,
  };

  async function cargarEstado(silencioso = false) {
    if (!silencioso) {
      setRespuesta((estadoActual) =>
        estadoActual.estadoVista === 'disponible'
          ? estadoActual
          : { estadoVista: 'cargando', cancion: null, mensaje: t.cargando },
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
        mensaje: t.errorComunicacion,
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
      setRespuesta({ estadoVista: 'error', cancion: null, mensaje: t.errorAccion });
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
    if (!url) return;
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

  async function descargarCancion() {
    if (!cancion?.urlCancion) return;
    setEstadoDescarga('descargando');
    try {
      const resultado = await enviarMensajeDescarga({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'descargar-cancion',
        urlCancion: cancion.urlCancion,
      });
      setEstadoDescarga(resultado.exito ? 'ok' : 'error');
    } catch {
      setEstadoDescarga('error');
    } finally {
      setTimeout(() => setEstadoDescarga(null), 3000);
    }
  }

  function cambiarIdioma(nuevoIdioma: Idioma) {
    guardarIdioma(nuevoIdioma);
    setIdioma(nuevoIdioma);
  }

  function cambiarColorTema(nuevoColor: string) {
    const colorNormalizado = normalizarColorTema(nuevoColor);
    guardarColorTema(colorNormalizado);
    setColorTema(colorNormalizado);
  }

  return (
    <main className="relative w-full">
      <section className="fondo-tarjeta sombra-tarjeta relative overflow-hidden" style={estiloTarjeta}>
        {/* <div className="absolute left-0 top-0 z-20 h-1 w-full" style={estiloBarraTema} /> */}
        <FondoPortada portada={portada} descripcion={descripcionPortada(cancion)} />

        {vista === 'ajustes' ? (
          <PantallaAjustes
            idioma={idioma}
            t={t}
            colorTema={colorTema}
            onVolver={() => setVista('principal')}
            onCambiarIdioma={cambiarIdioma}
            onCambiarColor={cambiarColorTema}
          />
        ) : (
          <div className="relative z-10 flex min-h-[391px] flex-col gap-4 px-4 pb-4 pt-4.5">
            <CabeceraPopup
              respuesta={respuesta}
              t={t}
              onAbrirAjustes={() => setVista('ajustes')}
            />

            <BloqueCancion
              cancion={cancion}
              respuesta={respuesta}
              bloqueado={accionEnCurso !== null}
              t={t}
              onAbrirEnlace={abrirEnlace}
            />

            {respuesta.estadoVista === 'disponible' && cancion ? (
              <ControlesReproductor
                cancion={cancion}
                bloqueado={controlesBloqueados}
                t={t}
                estadoDescarga={estadoDescarga}
                onEjecutarAccion={ejecutarAccion}
                onDescargar={descargarCancion}
              />
            ) : (
              <AccionesEstado
                bloqueado={accionEnCurso !== null}
                t={t}
                onAbrirSoundCloud={abrirSoundCloud}
                onRecargar={async () => {
                  await cargarEstado();
                }}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
}

async function enviarMensaje(mensaje: SolicitudPopup) {
  return (await browser.runtime.sendMessage(mensaje)) as RespuestaPopup;
}

async function enviarMensajeDescarga(mensaje: SolicitudPopup & { tipo: 'descargar-cancion' }) {
  return (await browser.runtime.sendMessage(mensaje)) as RespuestaDescarga;
}

export default AplicacionPopup;

