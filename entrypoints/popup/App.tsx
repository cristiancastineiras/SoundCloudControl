import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { GearSix, SlidersHorizontal, X } from '@phosphor-icons/react';
import { CAPACIDADES } from '@/shared';
import {
  ACCIONES_REPRODUCTOR,
  MODOS_REPETICION,
  obtenerImagenGrande,
  type AccionReproductor,
  type EstadoCancion,
} from '@/entities/reproductor';
import {
  type RespuestaDescarga,
  type RespuestaEqualizador,
  type RespuestaPopup,
  type SolicitudPopup,
} from '@/services/mensajeria';
import {
  crearAjustesEqualizadorDesdePreset,
  crearEstadoEqualizador,
  normalizarAjustesEqualizador,
  type AjustesEqualizador,
  type IdBandaEqualizador,
  type IdPresetEqualizador,
} from '@/entities/equalizador';
import {
  type Idioma,
  TEXTOS,
  type Textos,
} from '@/features/i18n';
import {
  hexARgb,
  normalizarColorTema,
  rgbATripleta,
  type IntervaloActualizacion,
  type ModoApariencia,
} from '@/entities/preferencias';
import {
  guardarColorTema,
  guardarIdioma,
  guardarIntervalo,
  guardarModoApariencia,
  guardarModoCompacto,
  guardarMostrarDescargaMp3,
  guardarMostrarSliderVolumen,
  guardarMostrarControlVelocidad,
  guardarVersionNotifVista,
  leerVersionNotifVista,
  type PreferenciasPersistidas,
} from '@/services/almacenamiento';
import {
  aplicarLayoutCompactoPopup,
  aplicarModoAparienciaDocumento,
  obtenerAnchoPopup,
  programarSincronizacionTamanoPopup,
} from '@/app/documento';
import { AccionesEstado } from './componentes/AccionesEstado';
import { BloqueCancion } from './componentes/BloqueCancion';
import { BotonSeguirArtista } from './componentes/BotonSeguirArtista';
import { CabeceraPopup } from './componentes/CabeceraPopup';
import { ControlVolumen } from './componentes/ControlVolumen';
import { ControlVelocidad } from './componentes/ControlVelocidad';
import { ControlesReproductor } from './componentes/ControlesReproductor';
import { FondoPortada } from './componentes/FondoPortada';
import { IconoControl } from './componentes/IconoControl';
import { PantallaAjustes } from './componentes/PantallaAjustes';
import { PantallaEqualizador } from './componentes/PantallaEqualizador';
import { etiquetaEstado } from '@/features/reproductor';

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

function AplicacionPopup(props: { preferenciasIniciales: PreferenciasPersistidas }) {
  const { preferenciasIniciales } = props;

  // ---- Estado de UI --------------------------------------------------------
  const [idioma, setIdioma] = useState<Idioma>(preferenciasIniciales.idioma);
  const [vista, setVista] = useState<Vista>('principal');
  const [colorTema, setColorTema] = useState(preferenciasIniciales.colorTema);
  const [modoApariencia, setModoApariencia] = useState<ModoApariencia>(preferenciasIniciales.modoApariencia);
  const [mostrarDescargaMp3, setMostrarDescargaMp3] = useState(preferenciasIniciales.mostrarDescargaMp3);
  const [mostrarSliderVolumen, setMostrarSliderVolumen] = useState(preferenciasIniciales.mostrarSliderVolumen);
  const [mostrarControlVelocidad, setMostrarControlVelocidad] = useState(preferenciasIniciales.mostrarControlVelocidad);
  const [intervaloActualizacion, setIntervaloActualizacion] = useState<IntervaloActualizacion>(preferenciasIniciales.intervaloActualizacion);
  const [modoCompacto, setModoCompacto] = useState(preferenciasIniciales.modoCompacto);
  const [versionLatest, setVersionLatest] = useState<string | null>(null);
  const [notifActualizacionVisible, setNotifActualizacionVisible] = useState(false);

  // ---- Estado de datos -----------------------------------------------------
  const t = TEXTOS[idioma];
  const [respuesta, setRespuesta] = useState<RespuestaPopup>(() => ({
    estadoVista: 'cargando',
    cancion: null,
    mensaje: TEXTOS[preferenciasIniciales.idioma].cargando,
  }));
  const [respuestaEqualizador, setRespuestaEqualizador] = useState<RespuestaEqualizador>(() => ({
    tipo: 'equalizador',
    estadoVista: 'cargando',
    equalizador: crearEstadoEqualizador(),
    mensaje: TEXTOS[preferenciasIniciales.idioma].eqCargando,
  }));
  const [accionEnCurso, setAccionEnCurso] = useState<AccionInterfaz | null>(null);
  const [estadoDescarga, setEstadoDescarga] = useState<EstadoDescarga>(null);
  const [guardandoEqualizador, setGuardandoEqualizador] = useState(false);
  const [volumenTemporal, setVolumenTemporal] = useState<number | null>(null);
  const [velocidadTemporal, setVelocidadTemporal] = useState<number | null>(null);

  // ---- Refs ----------------------------------------------------------------
  const botonAjustesRef = useRef<HTMLButtonElement | null>(null);
  const botonEqualizadorRef = useRef<HTMLButtonElement | null>(null);
  const botonVolverRef = useRef<HTMLButtonElement | null>(null);
  const botonVolverEqualizadorRef = useRef<HTMLButtonElement | null>(null);
  const popupRootRef = useRef<HTMLElement | null>(null);
  const vistaAnteriorRef = useRef<Vista>('principal');
  const revisionVolumenRef = useRef(0);
  const revisionVelocidadRef = useRef(0);
  const revisionEqualizadorRef = useRef(0);
  const temporizadorEqualizadorRef = useRef<number | null>(null);
  const ajustesEqualizadorPendientesRef = useRef<AjustesEqualizador | null>(null);

  // ---- Comunicación con background ----------------------------------------
  const cargarEstado = useEventCallback(async (silencioso = false) => {
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

  const cargarEqualizador = useEventCallback(async (silencioso = false) => {
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

  // ---- Comprobación de versión al montar ----------------------------------
  useEffect(() => {
    async function comprobarVersion() {
      try {
        const resp = await fetch(
          'https://api.github.com/repos/cristiancastineiras/SoundCloudControl/releases/latest',
          { headers: { Accept: 'application/vnd.github+json' } },
        );
        if (!resp.ok) return;
        const datos = (await resp.json()) as { tag_name?: string };
        const tagLatest = (datos.tag_name ?? '').replace(/^v/, '');
        if (!tagLatest) return;
        const versionActual = browser.runtime.getManifest().version;
        const vistaDismissed = await leerVersionNotifVista();
        if (esVersionMayor(tagLatest, versionActual) && vistaDismissed !== tagLatest) {
          setVersionLatest(tagLatest);
          setNotifActualizacionVisible(true);
        }
      } catch {
        // Error de red o API no disponible — silencioso
      }
    }
    void comprobarVersion();
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
  const popupCompactoActivo = vista === 'principal' && modoCompacto;
  const anchoPopup = obtenerAnchoPopup(popupCompactoActivo);
  const controlesBloqueados =
    accionEnCurso !== null || respuesta.estadoVista !== 'disponible';
  const volumenVisible = cancion
    ? volumenTemporal ?? cancion.volumen
    : 0;
  const silenciadoVisible = cancion
    ? volumenTemporal !== null
      ? volumenTemporal === 0
      : cancion.silenciado
    : false;
  const velocidadVisible = cancion
    ? velocidadTemporal ?? cancion.velocidadReproduccion ?? 1
    : 1;

  useEffect(() => {
    aplicarModoAparienciaDocumento(modoApariencia);
  }, [modoApariencia]);

  // ---- Sync tamaño real del popup en Chrome -------------------------------
  useLayoutEffect(() => {
    aplicarLayoutCompactoPopup(popupCompactoActivo);
    programarSincronizacionTamanoPopup(popupRootRef.current, anchoPopup);
  }, [anchoPopup, popupCompactoActivo]);

  useLayoutEffect(() => {
    const popupRoot = popupRootRef.current;

    if (!popupRoot || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observador = new ResizeObserver(() => {
      programarSincronizacionTamanoPopup(popupRoot, anchoPopup);
    });

    observador.observe(popupRoot);
    return () => {
      observador.disconnect();
    };
  }, [anchoPopup]);

  useLayoutEffect(() => {
    programarSincronizacionTamanoPopup(popupRootRef.current, anchoPopup);
  }, [
    accionEnCurso,
    anchoPopup,
    cancion?.artista,
    cancion?.titulo,
    estadoDescarga,
    guardandoEqualizador,
    idioma,
    modoApariencia,
    mostrarSliderVolumen,
    mostrarControlVelocidad,
    notifActualizacionVisible,
    respuesta.estadoVista,
    respuestaEqualizador.estadoVista,
    versionLatest,
    vista,
  ]);

  // ---- Atajos locales del popup ------------------------------------------
  useEffect(() => {
    if (vista !== 'principal' || respuesta.estadoVista !== 'disponible' || !cancion) {
      return undefined;
    }

    const alPulsarAtajoLocal = (evento: KeyboardEvent) => {
      if (
        evento.defaultPrevented ||
        evento.altKey ||
        evento.ctrlKey ||
        evento.metaKey ||
        accionEnCurso !== null ||
        esElementoEditable(document.activeElement)
      ) {
        return;
      }

      const tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;

      if (tecla === ' ' || tecla === 'k') {
        evento.preventDefault();
        void ejecutarAccion(ACCIONES_REPRODUCTOR.alternarReproduccion);
        return;
      }

      if (tecla === 'ArrowLeft' || tecla === 'j') {
        evento.preventDefault();
        void ejecutarAccion(ACCIONES_REPRODUCTOR.cancionAnterior);
        return;
      }

      if (tecla === 'ArrowRight' || tecla === 'l') {
        evento.preventDefault();
        void ejecutarAccion(ACCIONES_REPRODUCTOR.siguienteCancion);
        return;
      }

      if (tecla === 'f') {
        evento.preventDefault();
        void ejecutarAccion(ACCIONES_REPRODUCTOR.alternarMeGusta);
        return;
      }

      if (tecla === 's') {
        evento.preventDefault();
        void ejecutarAccion(ACCIONES_REPRODUCTOR.alternarAleatorio);
        return;
      }

      if (tecla === 'm') {
        evento.preventDefault();
        void ejecutarAccion(ACCIONES_REPRODUCTOR.alternarSilencio);
        return;
      }

      if (tecla === 'r') {
        evento.preventDefault();
        void ejecutarAccion(obtenerAccionRepeticionSiguiente(cancion.modoRepeticion));
        return;
      }

      if (tecla === 'ArrowUp' || tecla === '+' || tecla === '=') {
        evento.preventDefault();
        void ajustarVolumen(volumenVisible + 10);
        return;
      }

      if (tecla === 'ArrowDown' || tecla === '-') {
        evento.preventDefault();
        void ajustarVolumen(volumenVisible - 10);
      }
    };

    window.addEventListener('keydown', alPulsarAtajoLocal);
    return () => {
      window.removeEventListener('keydown', alPulsarAtajoLocal);
    };
  }, [accionEnCurso, cancion, respuesta.estadoVista, vista, volumenVisible]);

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

  const resumenEstadoEqualizador = CAPACIDADES.equalizador ? [
    t.equalizador,
    respuestaEqualizador.mensaje,
    equalizador.habilitado ? t.eqActivado : t.eqDesactivado,
    equalizador.audioDetectado ? t.eqAudioDetectado : t.eqAudioNoDetectado,
  ].join('. ') : '';

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

  async function ajustarVolumen(volumen: number) {
    const volumenNormalizado = normalizarVolumenUi(volumen);
    const revision = revisionVolumenRef.current + 1;

    revisionVolumenRef.current = revision;
    setVolumenTemporal(volumenNormalizado);

    try {
      const siguienteEstado = await enviarMensaje<RespuestaPopup>({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'ajustar-volumen',
        volumen: volumenNormalizado,
      });

      if (revision !== revisionVolumenRef.current) return;
      setRespuesta(siguienteEstado);
    } catch {
      if (revision !== revisionVolumenRef.current) return;
      void cargarEstado(true);
    } finally {
      if (revision === revisionVolumenRef.current) {
        setVolumenTemporal(null);
      }
    }
  }

  async function ajustarVelocidad(velocidad: number) {
    const revision = revisionVelocidadRef.current + 1;
    revisionVelocidadRef.current = revision;
    setVelocidadTemporal(velocidad);

    try {
      const siguienteEstado = await enviarMensaje<RespuestaPopup>({
        canal: 'soundcloud-control',
        destino: 'background',
        tipo: 'ajustar-velocidad',
        velocidad,
      });

      if (revision !== revisionVelocidadRef.current) return;
      setRespuesta(siguienteEstado);
    } catch {
      if (revision !== revisionVelocidadRef.current) return;
      void cargarEstado(true);
    } finally {
      if (revision === revisionVelocidadRef.current) {
        setVelocidadTemporal(null);
      }
    }
  }

  function cambiarIdioma(nuevoIdioma: Idioma) {
    void guardarIdioma(nuevoIdioma);
    setIdioma(nuevoIdioma);
  }

  function cambiarColorTema(nuevoColor: string) {
    const colorNormalizado = normalizarColorTema(nuevoColor);
    void guardarColorTema(colorNormalizado);
    setColorTema(colorNormalizado);
  }

  function cambiarModoApariencia(nuevoModo: ModoApariencia) {
    void guardarModoApariencia(nuevoModo);
    setModoApariencia(nuevoModo);
  }

  function cambiarIntervaloActualizacion(nuevo: IntervaloActualizacion) {
    void guardarIntervalo(nuevo);
    setIntervaloActualizacion(nuevo);
  }

  function cambiarMostrarDescargaMp3(mostrar: boolean) {
    void guardarMostrarDescargaMp3(mostrar);
    setMostrarDescargaMp3(mostrar);
  }

  function cambiarMostrarSliderVolumen(mostrar: boolean) {
    void guardarMostrarSliderVolumen(mostrar);
    setMostrarSliderVolumen(mostrar);
  }

  function cambiarMostrarControlVelocidad(mostrar: boolean) {
    void guardarMostrarControlVelocidad(mostrar);
    setMostrarControlVelocidad(mostrar);
  }

  function cambiarModoCompacto(compacto: boolean) {
    void guardarModoCompacto(compacto);
    setModoCompacto(compacto);
  }

  function descartarNotifActualizacion() {
    if (versionLatest) void guardarVersionNotifVista(versionLatest);
    setNotifActualizacionVisible(false);
  }

  // ---- Equalizador (debounce de guardado) ---------------------------------
  const guardarEqualizador = useEventCallback(
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

    setRespuestaEqualizador((estadoActual) => ({
      ...estadoActual,
      equalizador: crearEstadoEqualizador({
        ...estadoActual.equalizador,
        ...ajustesNormalizados,
        bandas: ajustesNormalizados.bandas,
      }),
    }));

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
    <main ref={popupRootRef} className="relative w-full" aria-labelledby={ID_TITULO_POPUP}>
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
            modoApariencia={modoApariencia}
            mostrarDescargaMp3={mostrarDescargaMp3}
            mostrarSliderVolumen={mostrarSliderVolumen}
            mostrarControlVelocidad={mostrarControlVelocidad}
            modoCompacto={modoCompacto}
            intervalo={intervaloActualizacion}
            backButtonRef={botonVolverRef}
            onVolver={() => setVista('principal')}
            onCambiarIdioma={cambiarIdioma}
            onCambiarColor={cambiarColorTema}
            onCambiarModoApariencia={cambiarModoApariencia}
            onCambiarMostrarDescargaMp3={cambiarMostrarDescargaMp3}
            onCambiarMostrarSliderVolumen={cambiarMostrarSliderVolumen}
            onCambiarMostrarControlVelocidad={cambiarMostrarControlVelocidad}
            onCambiarModoCompacto={cambiarModoCompacto}
            onCambiarIntervalo={cambiarIntervaloActualizacion}
          />
        ) : vista === 'equalizador' && CAPACIDADES.equalizador ? (
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
        ) : modoCompacto ? (
          // ── Compact strip ────────────────────────────────────────────────
          <div className="relative z-10 flex flex-col">

            <div className="flex items-stretch">
              {/* Cover — mismo alto que el panel derecho */}
              <div className="relative w-32 flex-none self-stretch overflow-hidden" aria-hidden="true">
                {portada ? (
                  <img src={portada} alt={cancion?.titulo ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="sc-cover-fill h-full w-full" />
                )}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-r from-transparent to-black/60" />
              </div>

              {/* Right panel: title / artist / buttons all within cover height */}
              <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2.5">

                {/* Title + settings icons */}
                <div className="flex min-w-0 items-start gap-1">
                  <button
                    type="button"
                    className="geist min-w-0 flex-1 truncate text-left text-[1rem] font-bold leading-tight text-marfil/95 transition-opacity hover:opacity-70 disabled:hover:opacity-100"
                    onClick={() => void abrirEnlace(cancion?.urlCancion ?? null)}
                    disabled={!cancion?.urlCancion || accionEnCurso !== null}
                    aria-label={cancion?.titulo ? t.abrirPaginaCancion(cancion.titulo) : respuesta.mensaje}
                    title={cancion?.titulo ?? respuesta.mensaje}>
                    {cancion?.titulo ?? respuesta.mensaje}
                  </button>
                  <div className="flex flex-none items-center">
                    {CAPACIDADES.equalizador ? (
                      <button
                        ref={botonEqualizadorRef}
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-full text-marfil/35 transition-colors hover:text-marfil/75"
                        aria-label={t.abrirEqualizador}
                        aria-expanded={false}
                        aria-controls={ID_PANEL_EQUALIZADOR}
                        onClick={() => setVista('equalizador')}>
                        <SlidersHorizontal size={11} weight="bold" />
                      </button>
                    ) : null}
                    <button
                      ref={botonAjustesRef}
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-marfil/35 transition-colors hover:text-marfil/75"
                      aria-label={t.abrirAjustes}
                      aria-expanded={false}
                      aria-controls={ID_PANEL_AJUSTES}
                      onClick={() => setVista('ajustes')}>
                      <GearSix size={11} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Artist + follow */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-[0.7rem] leading-none text-marfil/45 transition-opacity hover:opacity-70 disabled:hover:opacity-100"
                    onClick={() => void abrirEnlace(cancion?.urlArtista ?? null)}
                    disabled={!cancion?.urlArtista || accionEnCurso !== null}
                    aria-label={cancion?.artista ? t.abrirPaginaArtista(cancion.artista) : t.sinArtista}
                    title={cancion?.artista ?? t.sinArtista}>
                    {cancion?.artista ?? 'SoundCloud'}
                  </button>

                  {cancion?.puedeSeguirArtista ? (
                    <BotonSeguirArtista
                      compacto
                      artista={cancion.artista || t.sinArtista}
                      siguiendo={cancion.siguiendoArtista}
                      bloqueado={accionEnCurso !== null}
                      t={t}
                      onClick={() => {
                        void ejecutarAccion(ACCIONES_REPRODUCTOR.alternarSeguirArtista);
                      }}
                    />
                  ) : null}
                </div>

                {/* All controls in one line */}
                {respuesta.estadoVista === 'disponible' && cancion ? (
                  <ControlesCompactos
                    cancion={cancion}
                    bloqueado={controlesBloqueados}
                    t={t}
                    mostrarDescargaMp3={mostrarDescargaMp3}
                    estadoDescarga={estadoDescarga}
                    onEjecutarAccion={ejecutarAccion}
                    onDescargar={descargarCancion}
                  />
                ) : (
                  <AccionesEstado
                    compacto
                    bloqueado={accionEnCurso !== null}
                    t={t}
                    onAbrirSoundCloud={abrirSoundCloud}
                    onRecargar={async () => { await cargarEstado(); }}
                  />
                )}
              </div>
            </div>

            {respuesta.estadoVista === 'disponible' && cancion && mostrarSliderVolumen ? (
              <div className="border-t border-white/8 px-3.5 py-2.5">
                <ControlVolumen
                  compacto
                  volumen={volumenVisible}
                  silenciado={silenciadoVisible}
                  bloqueado={respuesta.estadoVista !== 'disponible'}
                  t={t}
                  onCambiarVolumen={ajustarVolumen}
                />
              </div>
            ) : null}

            {CAPACIDADES.controlVelocidad && respuesta.estadoVista === 'disponible' && cancion && mostrarControlVelocidad ? (
              <div className="border-t border-white/8 px-3.5 py-2.5">
                <ControlVelocidad
                  compacto
                  velocidad={velocidadVisible}
                  bloqueado={controlesBloqueados}
                  t={t}
                  onCambiarVelocidad={ajustarVelocidad}
                />
              </div>
            ) : null}

            {/* Update notification */}
            {notifActualizacionVisible && versionLatest && (
              <div className="flex items-center gap-2 border-t border-white/8 px-3.5 py-2">
                <span className="flex-1 text-[0.7rem] font-medium leading-tight text-marfil/65">
                  {t.nuevaVersionDisponible(versionLatest)}
                </span>
                <a
                  href="https://github.com/cristiancastineiras/SoundCloudControl/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-none rounded-lg border border-white/12 bg-white/6 px-2.5 py-1 text-[0.68rem] font-semibold transition-colors hover:border-white/22 hover:bg-white/10"
                  style={{ color: 'rgb(var(--sc-theme-rgb))' }}
                  onClick={descartarNotifActualizacion}>
                  {t.actualizar}
                </a>
                <button
                  type="button"
                  aria-label={t.cerrarNotificacion}
                  className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-marfil/40 transition-colors hover:text-marfil/75"
                  onClick={descartarNotifActualizacion}>
                  <X size={10} weight="bold" />
                </button>
              </div>
            )}
          </div>
        ) : (
          // ── Normal layout ────────────────────────────────────────────────
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
              onAlternarSeguimientoArtista={() => ejecutarAccion(ACCIONES_REPRODUCTOR.alternarSeguirArtista)}
            />

            {respuesta.estadoVista === 'disponible' && cancion ? (
              <>
                <ControlesReproductor
                  cancion={cancion}
                  bloqueado={controlesBloqueados}
                  t={t}
                  estadoDescarga={estadoDescarga}
                  mostrarBotonDescarga={mostrarDescargaMp3}
                  onEjecutarAccion={ejecutarAccion}
                  onDescargar={descargarCancion}
                />

                {mostrarSliderVolumen ? (
                  <ControlVolumen
                    volumen={volumenVisible}
                    silenciado={silenciadoVisible}
                    bloqueado={respuesta.estadoVista !== 'disponible'}
                    t={t}
                    onCambiarVolumen={ajustarVolumen}
                  />
                ) : null}

                {CAPACIDADES.controlVelocidad && mostrarControlVelocidad ? (
                  <ControlVelocidad
                    velocidad={velocidadVisible}
                    bloqueado={controlesBloqueados}
                    t={t}
                    onCambiarVelocidad={ajustarVelocidad}
                  />
                ) : null}
              </>
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

            {notifActualizacionVisible && versionLatest && (
              <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2.5">
                <span className="flex-1 text-[0.74rem] font-medium leading-tight text-marfil/80">
                  {t.nuevaVersionDisponible(versionLatest)}
                </span>
                <a
                  href="https://github.com/cristiancastineiras/SoundCloudControl/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="sc-chip px-2.5 py-1 text-[0.7rem]"
                  style={{ color: 'rgb(var(--sc-theme-rgb))' }}
                  onClick={descartarNotifActualizacion}>
                  {t.actualizar}
                </a>
                <button
                  type="button"
                  aria-label={t.cerrarNotificacion}
                  className="flex items-center justify-center rounded-lg p-1 text-marfil/50 transition-colors hover:text-marfil"
                  onClick={descartarNotifActualizacion}>
                  <X size={11} weight="bold" />
                </button>
              </div>
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

function esVersionMayor(a: string, b: string): boolean {
  const parsear = (v: string) => v.split('.').map((n) => Number(n) || 0);
  const [aMa, aMi, aPa] = parsear(a);
  const [bMa, bMi, bPa] = parsear(b);
  if (aMa !== bMa) return aMa > bMa;
  if (aMi !== bMi) return aMi > bMi;
  return aPa > bPa;
}

function useEventCallback<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(((...args: Parameters<T>) => callbackRef.current(...args)) as T, []);
}

function normalizarVolumenUi(valor: number) {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(100, Math.round(valor)));
}

function obtenerAccionRepeticionSiguiente(modoActual: EstadoCancion['modoRepeticion']) {
  switch (modoActual) {
    case MODOS_REPETICION.apagado:
      return ACCIONES_REPRODUCTOR.establecerRepeticionLista;
    case MODOS_REPETICION.lista:
      return ACCIONES_REPRODUCTOR.establecerRepeticionPista;
    case MODOS_REPETICION.pista:
    default:
      return ACCIONES_REPRODUCTOR.desactivarRepeticion;
  }
}

function esElementoEditable(elemento: Element | null) {
  if (!(elemento instanceof HTMLElement)) return false;
  if (elemento.isContentEditable) return true;

  const etiqueta = elemento.tagName;
  return etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT';
}

function ControlesCompactos(props: {
  cancion: EstadoCancion;
  bloqueado: boolean;
  t: Textos;
  mostrarDescargaMp3: boolean;
  estadoDescarga: EstadoDescarga;
  onEjecutarAccion: (accion: AccionReproductor) => Promise<void> | void;
  onDescargar: () => Promise<void> | void;
}) {
  const { bloqueado, cancion, estadoDescarga, mostrarDescargaMp3, onDescargar, onEjecutarAccion, t } = props;
  const aleatorioActivo = cancion.aleatorioActivo;
  const repeticionListaActiva = cancion.modoRepeticion === MODOS_REPETICION.lista;
  const repeticionPistaActiva = cancion.modoRepeticion === MODOS_REPETICION.pista;
  const accionRepeticionLista = repeticionListaActiva
    ? ACCIONES_REPRODUCTOR.desactivarRepeticion
    : ACCIONES_REPRODUCTOR.establecerRepeticionLista;
  const accionRepeticionPista = repeticionPistaActiva
    ? ACCIONES_REPRODUCTOR.desactivarRepeticion
    : ACCIONES_REPRODUCTOR.establecerRepeticionPista;

  return (
    <div
      className="flex items-center gap-1.5 mt-4"
      role="group"
      aria-label={t.controlesTransporte}>
      {mostrarDescargaMp3 && estadoDescarga ? (
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {estadoDescarga === 'descargando' ? t.descargando
            : estadoDescarga === 'ok' ? t.descargaOk
            : t.descargaError}
        </p>
      ) : null}
      <button type="button" className="sc-btn-xs" aria-label={t.pistaAnterior} disabled={bloqueado}
        onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.cancionAnterior)}>
        <IconoControl nombre="anterior" className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs sc-btn-xs-primary" aria-label={cancion.reproduciendo ? t.pausar : t.reproducir} disabled={bloqueado}
        onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarReproduccion)}>
        <IconoControl nombre={cancion.reproduciendo ? 'pausa' : 'play'} className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs" aria-label={t.siguientePista} disabled={bloqueado}
        onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.siguienteCancion)}>
        <IconoControl nombre="siguiente" className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs" data-active={aleatorioActivo ? 'true' : 'false'} aria-pressed={aleatorioActivo}
        aria-label={`${t.alternarAleatorio}. ${aleatorioActivo ? t.activado : t.desactivado}`} disabled={bloqueado}
        onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarAleatorio)}>
        <IconoControl nombre="aleatorio" weight={aleatorioActivo ? 'fill' : 'regular'} className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs" data-active={repeticionListaActiva ? 'true' : 'false'} aria-pressed={repeticionListaActiva}
        aria-label={`${t.alternarRepeticionLista}. ${repeticionListaActiva ? t.activado : t.desactivado}`} disabled={bloqueado}
        onClick={() => void onEjecutarAccion(accionRepeticionLista)}>
        <IconoControl nombre="repetirLista" weight={repeticionListaActiva ? 'fill' : 'regular'} className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs" data-active={repeticionPistaActiva ? 'true' : 'false'} aria-pressed={repeticionPistaActiva}
        aria-label={`${t.alternarRepeticionPista}. ${repeticionPistaActiva ? t.activado : t.desactivado}`} disabled={bloqueado}
        onClick={() => void onEjecutarAccion(accionRepeticionPista)}>
        <IconoControl nombre="repetirPista" weight={repeticionPistaActiva ? 'fill' : 'regular'} className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs" data-active={cancion.meGustaActivo ? 'true' : 'false'} data-variant="soft"
        aria-pressed={cancion.meGustaActivo}
        aria-label={`${cancion.meGustaActivo ? t.quitarMeGusta : t.marcarMeGusta}. ${cancion.meGustaActivo ? t.activado : t.desactivado}`}
        disabled={bloqueado} onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarMeGusta)}>
        <IconoControl nombre="corazon" weight={cancion.meGustaActivo ? 'fill' : 'regular'} className="h-4 w-4" />
      </button>
      <button type="button" className="sc-btn-xs" data-active={cancion.silenciado ? 'true' : 'false'} data-variant="soft"
        aria-pressed={cancion.silenciado}
        aria-label={`${cancion.silenciado ? t.activarSonido : t.silenciarSonido}. ${cancion.silenciado ? t.activado : t.desactivado}`}
        disabled={bloqueado} onClick={() => void onEjecutarAccion(ACCIONES_REPRODUCTOR.alternarSilencio)}>
        <IconoControl nombre={cancion.silenciado ? 'volumenMute' : 'volumenAlto'} weight={cancion.silenciado ? 'fill' : 'regular'} className="h-4 w-4" />
      </button>
      {mostrarDescargaMp3 && (
        <button type="button" className="sc-btn-xs" data-active={estadoDescarga === 'ok' ? 'true' : 'false'}
          aria-label={estadoDescarga === 'descargando' ? t.descargando : estadoDescarga === 'ok' ? t.descargaOk : estadoDescarga === 'error' ? t.descargaError : t.descargarMp3}
          disabled={bloqueado || estadoDescarga === 'descargando'} aria-busy={estadoDescarga === 'descargando'}
          onClick={() => void onDescargar()}>
          <IconoControl nombre={estadoDescarga === 'descargando' ? 'recargar' : 'descargar'} weight="regular"
            className={estadoDescarga === 'descargando' ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
        </button>
      )}
    </div>
  );
}

export default AplicacionPopup;
