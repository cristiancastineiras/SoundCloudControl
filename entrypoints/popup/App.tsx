import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  type AccionReproductor,
  type RespuestaDescarga,
  type RespuestaEqualizador,
  type RespuestaPopup,
  type SolicitudPopup,
} from '../../lib/contratos';
import {
  crearAjustesEqualizadorDesdePreset,
  crearEstadoEqualizador,
  normalizarAjustesEqualizador,
  type AjustesEqualizador,
  type IdBandaEqualizador,
  type IdPresetEqualizador,
} from '../../lib/equalizer';
import { obtenerImagenGrande } from '../../lib/soundcloud';
import {
  type Idioma,
  TEXTOS,
  guardarIdioma,
  obtenerIdioma,
} from './i18n';
import {
  guardarColorTema,
  hexARgb,
  leerColorTema,
  normalizarColorTema,
  rgbATripleta,
} from './tema';
import {
  guardarIntervalo,
  guardarMostrarDescargaMp3,
  leerIntervalo,
  leerMostrarDescargaMp3,
  type IntervaloActualizacion,
} from './preferencias';
import { AccionesEstado } from './componentes/AccionesEstado';
import { BloqueCancion } from './componentes/BloqueCancion';
import { CabeceraPopup } from './componentes/CabeceraPopup';
import { ControlesReproductor } from './componentes/ControlesReproductor';
import { FondoPortada } from './componentes/FondoPortada';
import { PantallaAjustes } from './componentes/PantallaAjustes';
import { PantallaEqualizador } from './componentes/PantallaEqualizador';
import { etiquetaEstado } from './utilidades';

// ---- Constantes de IDs (a11y) ----------------------------------------------
const ID_TITULO_POPUP = 'sc-popup-title';
const ID_ESTADO_VIVO = 'sc-popup-live-status';
const ID_PANEL_AJUSTES = 'sc-popup-settings-panel';
const ID_AYUDA_AJUSTES = 'sc-popup-settings-help';
const ID_PANEL_EQUALIZADOR = 'sc-popup-equalizer-panel';
const ID_AYUDA_EQUALIZADOR = 'sc-popup-equalizer-help';

// ---- Tiempos ---------------------------------------------------------------
const RETARDO_RESET_DESCARGA_MS = 3000;
const RETARDO_GUARDADO_EQ_MS = 90;

type Vista = 'principal' | 'ajustes' | 'equalizador';
type AccionInterfaz = AccionReproductor | 'abrir-soundcloud' | 'abrir-enlace';
type EstadoDescarga = null | 'descargando' | 'ok' | 'error';

function AplicacionPopup() {
  // ---- Estado de UI --------------------------------------------------------
  const [idioma, setIdioma] = useState<Idioma>(obtenerIdioma);
  const [vista, setVista] = useState<Vista>('principal');
  const [colorTema, setColorTema] = useState(leerColorTema);
  const [mostrarDescargaMp3, setMostrarDescargaMp3] = useState(leerMostrarDescargaMp3);
  const [intervaloActualizacion, setIntervaloActualizacion] = useState<IntervaloActualizacion>(leerIntervalo);

  // ---- Estado de datos -----------------------------------------------------
  const t = TEXTOS[idioma];
  const [respuesta, setRespuesta] = useState<RespuestaPopup>(() => ({
    estadoVista: 'cargando',
    cancion: null,
    mensaje: TEXTOS[obtenerIdioma()].cargando,
  }));
  const [respuestaEqualizador, setRespuestaEqualizador] = useState<RespuestaEqualizador>(() => ({
    tipo: 'equalizador',
    estadoVista: 'cargando',
    equalizador: crearEstadoEqualizador(),
    mensaje: TEXTOS[obtenerIdioma()].eqCargando,
  }));
  const [accionEnCurso, setAccionEnCurso] = useState<AccionInterfaz | null>(null);
  const [estadoDescarga, setEstadoDescarga] = useState<EstadoDescarga>(null);
  const [guardandoEqualizador, setGuardandoEqualizador] = useState(false);

  // ---- Refs ----------------------------------------------------------------
  const botonAjustesRef = useRef<HTMLButtonElement | null>(null);
  const botonEqualizadorRef = useRef<HTMLButtonElement | null>(null);
  const botonVolverRef = useRef<HTMLButtonElement | null>(null);
  const botonVolverEqualizadorRef = useRef<HTMLButtonElement | null>(null);
  const vistaAnteriorRef = useRef<Vista>('principal');
  const revisionEqualizadorRef = useRef(0);
  const temporizadorEqualizadorRef = useRef<number | null>(null);
  const ajustesEqualizadorPendientesRef = useRef<AjustesEqualizador | null>(null);

  // ---- Comunicación con background ----------------------------------------
  const cargarEstado = useEffectEvent(async (silencioso = false) => {
    if (!silencioso) {
      setRespuesta((estadoActual) =>
        estadoActual.estadoVista === 'disponible'
          ? estadoActual
          : { estadoVista: 'cargando', cancion: null, mensaje: t.cargando },
      );
    }

    try {
      const siguienteEstado = await enviarMensaje<RespuestaPopup>({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'obtener-estado',
      });
      setRespuesta(siguienteEstado);
    } catch {
      setRespuesta({ estadoVista: 'error', cancion: null, mensaje: t.errorComunicacion });
    }
  });

  const cargarEqualizador = useEffectEvent(async (silencioso = false) => {
    if (!silencioso) {
      setRespuestaEqualizador((estadoActual) => ({
        ...estadoActual,
        estadoVista: estadoActual.estadoVista === 'disponible' ? 'disponible' : 'cargando',
        mensaje: t.eqCargando,
      }));
    }

    try {
      const siguienteEstado = await enviarMensaje<RespuestaEqualizador>({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'obtener-equalizador',
      });

      if (ajustesEqualizadorPendientesRef.current) return;
      setRespuestaEqualizador(siguienteEstado);
    } catch {
      if (ajustesEqualizadorPendientesRef.current) return;
      setRespuestaEqualizador((estadoActual) => ({
        ...estadoActual,
        estadoVista: 'error',
        mensaje: t.eqErrorComunicacion,
      }));
    }
  });

  // ---- Polling -------------------------------------------------------------
  useEffect(() => {
    void cargarEstado();
    void cargarEqualizador(true);

    const intervalo = window.setInterval(() => {
      void cargarEstado(true);

      if (
        vista === 'equalizador' &&
        !guardandoEqualizador &&
        temporizadorEqualizadorRef.current === null
      ) {
        void cargarEqualizador(true);
      }
    }, intervaloActualizacion);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [guardandoEqualizador, intervaloActualizacion, vista]);

  // ---- Cargar EQ al entrar a su vista -------------------------------------
  useEffect(() => {
    if (vista !== 'equalizador' || temporizadorEqualizadorRef.current !== null) return;
    void cargarEqualizador();
  }, [vista]);

  // ---- Limpiar temporizador del EQ al desmontar ---------------------------
  useEffect(() => () => {
    if (temporizadorEqualizadorRef.current !== null) {
      window.clearTimeout(temporizadorEqualizadorRef.current);
    }
  }, []);

  // ---- Sync de idioma + título de la pestaña ------------------------------
  useEffect(() => {
    document.documentElement.lang = idioma;
    document.title =
      vista === 'ajustes'
        ? `${t.ajustes} | ${t.appNombre}`
        : vista === 'equalizador'
          ? `${t.equalizador} | ${t.appNombre}`
          : t.appNombre;
  }, [idioma, t, vista]);

  // ---- Gestión de foco al cambiar de vista --------------------------------
  useEffect(() => {
    const vistaAnterior = vistaAnteriorRef.current;
    if (vista === 'ajustes') botonVolverRef.current?.focus();
    else if (vista === 'equalizador') botonVolverEqualizadorRef.current?.focus();
    else if (vistaAnterior === 'ajustes') botonAjustesRef.current?.focus();
    else if (vistaAnterior === 'equalizador') botonEqualizadorRef.current?.focus();
    vistaAnteriorRef.current = vista;
  }, [vista]);

  // ---- Cierre con Escape ---------------------------------------------------
  useEffect(() => {
    if (vista === 'principal') return undefined;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      setVista('principal');
    };
    window.addEventListener('keydown', alPulsarTecla);
    return () => {
      window.removeEventListener('keydown', alPulsarTecla);
    };
  }, [vista]);

  // ---- Derivados de render -------------------------------------------------
  const cancion = respuesta.cancion;
  const equalizador = respuestaEqualizador.equalizador;
  const portada = obtenerImagenGrande(cancion?.urlImagen ?? null);
  const controlesBloqueados =
    accionEnCurso !== null || respuesta.estadoVista !== 'disponible';

  // El gradiente de la tarjeta lo aporta `.sc-card`; aquí solo inyectamos el
  // RGB del tema activo en una variable CSS para que toda la cascada reaccione.
  const variablesTema = useMemo<CSSProperties>(() => {
    const rgb = hexARgb(colorTema);
    return { ['--sc-theme-rgb' as string]: rgbATripleta(rgb) } as CSSProperties;
  }, [colorTema]);

  const estadoInteractivoCargando =
    respuesta.estadoVista === 'cargando' ||
    accionEnCurso !== null ||
    estadoDescarga === 'descargando' ||
    guardandoEqualizador;

  const textoEstadoDescarga =
    estadoDescarga === 'descargando'
      ? t.descargando
      : estadoDescarga === 'ok'
        ? t.descargaOk
        : estadoDescarga === 'error'
          ? t.descargaError
          : '';

  const resumenEstadoEqualizador = [
    t.equalizador,
    respuestaEqualizador.mensaje,
    equalizador.habilitado ? t.eqActivado : t.eqDesactivado,
    equalizador.audioDetectado ? t.eqAudioDetectado : t.eqAudioNoDetectado,
  ].join('. ');

  const resumenEstadoEnVivo =
    vista === 'equalizador'
      ? resumenEstadoEqualizador
      : textoEstadoDescarga ||
        (respuesta.estadoVista === 'disponible' && cancion
          ? [
              etiquetaEstado(respuesta, t),
              cancion.titulo,
              cancion.artista || t.sinArtista,
              cancion.reproduciendo ? t.reproduciendoAhora : t.pausadoAhora,
              t.volumenActual(cancion.volumen),
            ].join('. ')
          : [etiquetaEstado(respuesta, t), respuesta.mensaje].filter(Boolean).join('. '));

  const anuncioUrgente =
    respuesta.estadoVista === 'error' ||
    estadoDescarga === 'error' ||
    respuestaEqualizador.estadoVista === 'error';

  // ---- Acciones ------------------------------------------------------------
  async function ejecutarAccion(accion: AccionReproductor) {
    setAccionEnCurso(accion);
    try {
      const siguienteEstado = await enviarMensaje<RespuestaPopup>({
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
      await enviarMensaje<RespuestaPopup>({
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
      await enviarMensaje<RespuestaPopup>({
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
      const resultado = await enviarMensaje<RespuestaDescarga>({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'descargar-cancion',
        urlCancion: cancion.urlCancion,
      });
      setEstadoDescarga(resultado.exito ? 'ok' : 'error');
    } catch {
      setEstadoDescarga('error');
    } finally {
      setTimeout(() => setEstadoDescarga(null), RETARDO_RESET_DESCARGA_MS);
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

  function cambiarIntervaloActualizacion(nuevo: IntervaloActualizacion) {
    guardarIntervalo(nuevo);
    setIntervaloActualizacion(nuevo);
  }

  function cambiarMostrarDescargaMp3(mostrar: boolean) {
    guardarMostrarDescargaMp3(mostrar);
    setMostrarDescargaMp3(mostrar);
  }

  // ---- Equalizador (debounce de guardado) ---------------------------------
  const guardarEqualizador = useEffectEvent(
    async (ajustesSiguientes: AjustesEqualizador, revision: number) => {
      try {
        const siguienteEstado = await enviarMensaje<RespuestaEqualizador>({
          canal: 'soundcloud-control',
          destino: 'background',
          tipo: 'guardar-equalizador',
          ajustes: ajustesSiguientes,
        });

        if (
          revision !== revisionEqualizadorRef.current ||
          ajustesEqualizadorPendientesRef.current
        ) return;

        setRespuestaEqualizador(siguienteEstado);
      } catch {
        if (
          revision !== revisionEqualizadorRef.current ||
          ajustesEqualizadorPendientesRef.current
        ) return;

        setRespuestaEqualizador((estadoActual) => ({
          ...estadoActual,
          estadoVista: 'error',
          mensaje: t.eqErrorGuardar,
        }));
      } finally {
        if (
          revision === revisionEqualizadorRef.current &&
          !ajustesEqualizadorPendientesRef.current &&
          temporizadorEqualizadorRef.current === null
        ) {
          setGuardandoEqualizador(false);
        }
      }
    },
  );

  function programarGuardadoEqualizador(ajustesSiguientes: AjustesEqualizador) {
    const ajustesNormalizados = normalizarAjustesEqualizador(ajustesSiguientes);

    revisionEqualizadorRef.current += 1;
    const revision = revisionEqualizadorRef.current;

    ajustesEqualizadorPendientesRef.current = ajustesNormalizados;
    setGuardandoEqualizador(true);

    startTransition(() => {
      setRespuestaEqualizador((estadoActual) => ({
        ...estadoActual,
        equalizador: crearEstadoEqualizador({
          ...estadoActual.equalizador,
          ...ajustesNormalizados,
          bandas: ajustesNormalizados.bandas,
        }),
      }));
    });

    if (temporizadorEqualizadorRef.current !== null) {
      window.clearTimeout(temporizadorEqualizadorRef.current);
    }

    temporizadorEqualizadorRef.current = window.setTimeout(() => {
      temporizadorEqualizadorRef.current = null;
      const pendientes = ajustesEqualizadorPendientesRef.current;
      ajustesEqualizadorPendientesRef.current = null;

      if (pendientes) {
        void guardarEqualizador(pendientes, revision);
        return;
      }

      if (revision === revisionEqualizadorRef.current) {
        setGuardandoEqualizador(false);
      }
    }, RETARDO_GUARDADO_EQ_MS);
  }

  function actualizarEqualizador(
    transformador: (actual: AjustesEqualizador) => AjustesEqualizador,
  ) {
    const actuales = normalizarAjustesEqualizador(respuestaEqualizador.equalizador);
    programarGuardadoEqualizador(normalizarAjustesEqualizador(transformador(actuales)));
  }

  function cambiarHabilitadoEqualizador(habilitado: boolean) {
    actualizarEqualizador((actual) => ({ ...actual, habilitado }));
  }

  function cambiarPreampEqualizador(valor: number) {
    actualizarEqualizador((actual) => ({
      ...actual,
      preamp: valor,
      presetId: 'personalizado',
    }));
  }

  function cambiarBandaEqualizador(id: IdBandaEqualizador, valor: number) {
    actualizarEqualizador((actual) => ({
      ...actual,
      presetId: 'personalizado',
      bandas: { ...actual.bandas, [id]: valor },
    }));
  }

  function aplicarPresetEqualizador(presetId: IdPresetEqualizador) {
    programarGuardadoEqualizador({
      ...crearAjustesEqualizadorDesdePreset(presetId),
      habilitado: true,
    });
  }

  function restablecerEqualizador() {
    programarGuardadoEqualizador({
      ...crearAjustesEqualizadorDesdePreset('flat'),
      habilitado: respuestaEqualizador.equalizador.habilitado,
    });
  }

  // ---- Render --------------------------------------------------------------
  return (
    <main className="relative w-full" aria-labelledby={ID_TITULO_POPUP}>
      <h1 id={ID_TITULO_POPUP} className="sr-only">{t.appNombre}</h1>
      <p
        id={ID_ESTADO_VIVO}
        className="sr-only"
        role="status"
        aria-live={anuncioUrgente ? 'assertive' : 'polite'}
        aria-atomic="true">
        {resumenEstadoEnVivo}
      </p>

      <section
        className="sc-card sc-theme-ui"
        style={variablesTema}
        aria-busy={estadoInteractivoCargando}>
        <FondoPortada portada={portada} />

        {vista === 'ajustes' ? (
          <PantallaAjustes
            panelId={ID_PANEL_AJUSTES}
            ayudaId={ID_AYUDA_AJUSTES}
            idioma={idioma}
            t={t}
            colorTema={colorTema}
            mostrarDescargaMp3={mostrarDescargaMp3}
            intervalo={intervaloActualizacion}
            backButtonRef={botonVolverRef}
            onVolver={() => setVista('principal')}
            onCambiarIdioma={cambiarIdioma}
            onCambiarColor={cambiarColorTema}
            onCambiarMostrarDescargaMp3={cambiarMostrarDescargaMp3}
            onCambiarIntervalo={cambiarIntervaloActualizacion}
          />
        ) : vista === 'equalizador' ? (
          <PantallaEqualizador
            panelId={ID_PANEL_EQUALIZADOR}
            ayudaId={ID_AYUDA_EQUALIZADOR}
            t={t}
            respuesta={respuestaEqualizador}
            guardando={guardandoEqualizador}
            backButtonRef={botonVolverEqualizadorRef}
            onVolver={() => setVista('principal')}
            onCambiarHabilitado={cambiarHabilitadoEqualizador}
            onCambiarPreamp={cambiarPreampEqualizador}
            onCambiarBanda={cambiarBandaEqualizador}
            onAplicarPreset={aplicarPresetEqualizador}
            onRestablecer={restablecerEqualizador}
            onAbrirSoundCloud={abrirSoundCloud}
          />
        ) : (
          <div className="relative z-10 flex min-h-97.75 flex-col gap-4 px-4 pb-4 pt-4.5">
            <CabeceraPopup
              respuesta={respuesta}
              t={t}
              buttonRef={botonAjustesRef}
              equalizerButtonRef={botonEqualizadorRef}
              ajustesAbiertos={false}
              equalizadorAbierto={false}
              panelAjustesId={ID_PANEL_AJUSTES}
              panelEqualizadorId={ID_PANEL_EQUALIZADOR}
              onAbrirAjustes={() => setVista('ajustes')}
              onAbrirEqualizador={() => setVista('equalizador')}
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
                mostrarBotonDescarga={mostrarDescargaMp3}
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

async function enviarMensaje<TRespuesta>(mensaje: SolicitudPopup) {
  return (await browser.runtime.sendMessage(mensaje)) as TRespuesta;
}

export default AplicacionPopup;
