import {
  ArrowLeft,
  CaretDown,
  GithubLogo,
} from '@phosphor-icons/react';
import {
  useEffect,
  useId,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import pkg from '../../../package.json';
import {
  OPCIONES_IDIOMA,
  type Idioma,
  type Textos,
} from '@/features/i18n';
import {
  COLORES_TEMA_PRESET,
  esColorPreset,
  INTERVALOS_ACTUALIZACION,
  type IntervaloActualizacion,
  type ModoApariencia,
} from '@/entities/preferencias';

export function PantallaAjustes(props: {
  panelId: string;
  ayudaId: string;
  idioma: Idioma;
  t: Textos;
  colorTema: string;
  modoApariencia: ModoApariencia;
  mostrarDescargaMp3: boolean;
  mostrarSliderVolumen: boolean;
  mostrarControlVelocidad: boolean;
  modoCompacto: boolean;
  intervalo: IntervaloActualizacion;
  backButtonRef?: Ref<HTMLButtonElement>;
  onVolver: () => void;
  onCambiarIdioma: (idioma: Idioma) => void;
  onCambiarColor: (color: string) => void;
  onCambiarModoApariencia: (modoApariencia: ModoApariencia) => void;
  onCambiarMostrarDescargaMp3: (mostrar: boolean) => void;
  onCambiarMostrarSliderVolumen: (mostrar: boolean) => void;
  onCambiarMostrarControlVelocidad: (mostrar: boolean) => void;
  onCambiarModoCompacto: (compacto: boolean) => void;
  onCambiarIntervalo: (intervalo: IntervaloActualizacion) => void;
}) {
  const {
    ayudaId,
    backButtonRef,
    colorTema,
    idioma,
    intervalo,
    modoApariencia,
    mostrarDescargaMp3,
    mostrarSliderVolumen,
    mostrarControlVelocidad,
    modoCompacto,
    onCambiarColor,
    onCambiarIdioma,
    onCambiarModoApariencia,
    onCambiarMostrarDescargaMp3,
    onCambiarMostrarSliderVolumen,
    onCambiarMostrarControlVelocidad,
    onCambiarModoCompacto,
    onCambiarIntervalo,
    onVolver,
    panelId,
    t,
  } = props;

  const [guardado, setGuardado] = useState(false);
  const idiomaId = useId();
  const idiomaDescId = useId();
  const intervaloId = useId();
  const intervaloDescId = useId();
  const temaId = useId();
  const aparienciaId = useId();
  const aparienciaDescId = useId();
  const descargaId = useId();
  const descargaDescId = useId();
  const volumenId = useId();
  const volumenDescId = useId();
  const velocidadId = useId();
  const velocidadDescId = useId();
  const modoCompactoId = useId();
  const modoCompactoDescId = useId();
  const atajosId = useId();
  const atajosDescId = useId();
  const creditosId = useId();

  useEffect(() => {
    if (!guardado) return;
    const id = setTimeout(() => setGuardado(false), 1500);
    return () => clearTimeout(id);
  }, [guardado]);

  const mostrarGuardado = () => setGuardado(true);

  const opcionesIdioma = OPCIONES_IDIOMA;

  const etiquetaIntervalo = (ms: IntervaloActualizacion) =>
    ms === 2000 ? t.seg2 : ms === 4000 ? t.seg4 : t.seg8;

  return (
    <div
      id={panelId}
      className="sc-panel-bg relative z-10 flex flex-col px-4 pb-5 pt-4"
      role="region"
      aria-labelledby="sc-settings-title"
      aria-describedby={ayudaId}>
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          ref={backButtonRef}
          onClick={onVolver}
          aria-label={t.volverAlReproductor}
          className="sc-btn-back">
          <ArrowLeft size={15} weight="bold" />
        </button>
        <h2 id="sc-settings-title" className="m-0 text-[0.95rem] font-bold tracking-tight text-marfil">
          {t.ajustes}
        </h2>
        {guardado && (
          <span
            className="ml-auto text-[0.72rem] font-semibold text-bosque-400/90"
            role="status"
            aria-live="polite">
            OK {t.guardado}
          </span>
        )}
      </header>

      <p id={ayudaId} className="sr-only">{t.volverConEscape}</p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {guardado ? t.configuracionGuardada : ''}
      </p>

      <div className="flex flex-col gap-5 pr-1">
        <Seccion titulo={t.idiomaLabel} tituloId={idiomaId} descId={idiomaDescId}>
          <SelectAjuste
            id="sc-settings-language"
            labelledBy={idiomaId}
            value={idioma}
            options={opcionesIdioma}
            onChange={(value) => {
              onCambiarIdioma(value);
              mostrarGuardado();
            }}
          />
        </Seccion>

        <Seccion
          titulo={t.intervaloActualizacion}
          tituloId={intervaloId}
          desc={t.intervaloDesc}
          descId={intervaloDescId}>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby={intervaloId}
            aria-describedby={intervaloDescId}>
            {INTERVALOS_ACTUALIZACION.map((ms) => (
              <button
                key={ms}
                type="button"
                className="sc-chip"
                data-active={intervalo === ms ? 'true' : 'false'}
                aria-pressed={intervalo === ms}
                onClick={() => {
                  onCambiarIntervalo(ms);
                  mostrarGuardado();
                }}>
                {etiquetaIntervalo(ms)}
              </button>
            ))}
          </div>
        </Seccion>

        <Seccion titulo={t.tema} tituloId={temaId}>
          <SelectorColor
            valor={colorTema}
            t={t}
            labelledBy={temaId}
            onChange={(color) => {
              onCambiarColor(color);
              mostrarGuardado();
            }}
          />
        </Seccion>

        <Seccion
          titulo={t.modoApariencia}
          tituloId={aparienciaId}
          desc={t.modoAparienciaDesc}
          descId={aparienciaDescId}>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby={aparienciaId}
            aria-describedby={aparienciaDescId}>
            <button
              type="button"
              className="sc-chip"
              data-active={modoApariencia === 'dark' ? 'true' : 'false'}
              aria-pressed={modoApariencia === 'dark'}
              onClick={() => {
                onCambiarModoApariencia('dark');
                mostrarGuardado();
              }}>
              {t.modoOscuro}
            </button>
            <button
              type="button"
              className="sc-chip"
              data-active={modoApariencia === 'light' ? 'true' : 'false'}
              aria-pressed={modoApariencia === 'light'}
              onClick={() => {
                onCambiarModoApariencia('light');
                mostrarGuardado();
              }}>
              {t.modoClaro}
            </button>
          </div>
        </Seccion>

        <Seccion
          titulo={t.botonDescargaMp3}
          tituloId={descargaId}
          desc={t.botonDescargaMp3Desc}
          descId={descargaDescId}>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby={descargaId}
            aria-describedby={descargaDescId}>
            <button
              type="button"
              className="sc-chip"
              data-active={mostrarDescargaMp3 ? 'true' : 'false'}
              aria-pressed={mostrarDescargaMp3}
              onClick={() => {
                onCambiarMostrarDescargaMp3(true);
                mostrarGuardado();
              }}>
              {t.mostrar}
            </button>
            <button
              type="button"
              className="sc-chip"
              data-active={!mostrarDescargaMp3 ? 'true' : 'false'}
              aria-pressed={!mostrarDescargaMp3}
              onClick={() => {
                onCambiarMostrarDescargaMp3(false);
                mostrarGuardado();
              }}>
              {t.ocultar}
            </button>
          </div>
        </Seccion>

        <Seccion
          titulo={t.sliderVolumen}
          tituloId={volumenId}
          desc={t.sliderVolumenDesc}
          descId={volumenDescId}>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby={volumenId}
            aria-describedby={volumenDescId}>
            <button
              type="button"
              className="sc-chip"
              data-active={mostrarSliderVolumen ? 'true' : 'false'}
              aria-pressed={mostrarSliderVolumen}
              onClick={() => {
                onCambiarMostrarSliderVolumen(true);
                mostrarGuardado();
              }}>
              {t.mostrar}
            </button>
            <button
              type="button"
              className="sc-chip"
              data-active={!mostrarSliderVolumen ? 'true' : 'false'}
              aria-pressed={!mostrarSliderVolumen}
              onClick={() => {
                onCambiarMostrarSliderVolumen(false);
                mostrarGuardado();
              }}>
              {t.ocultar}
            </button>
          </div>
        </Seccion>

        <Seccion
          titulo={t.controlVelocidad}
          tituloId={velocidadId}
          desc={t.controlVelocidadDesc}
          descId={velocidadDescId}>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby={velocidadId}
            aria-describedby={velocidadDescId}>
            <button
              type="button"
              className="sc-chip"
              data-active={mostrarControlVelocidad ? 'true' : 'false'}
              aria-pressed={mostrarControlVelocidad}
              onClick={() => {
                onCambiarMostrarControlVelocidad(true);
                mostrarGuardado();
              }}>
              {t.mostrar}
            </button>
            <button
              type="button"
              className="sc-chip"
              data-active={!mostrarControlVelocidad ? 'true' : 'false'}
              aria-pressed={!mostrarControlVelocidad}
              onClick={() => {
                onCambiarMostrarControlVelocidad(false);
                mostrarGuardado();
              }}>
              {t.ocultar}
            </button>
          </div>
        </Seccion>

        <Seccion
          titulo={t.modoCompacto}
          tituloId={modoCompactoId}
          desc={t.modoCompactoDesc}
          descId={modoCompactoDescId}>
          <div
            className="flex gap-2"
            role="group"
            aria-labelledby={modoCompactoId}
            aria-describedby={modoCompactoDescId}>
            <button
              type="button"
              className="sc-chip"
              data-active={modoCompacto ? 'true' : 'false'}
              aria-pressed={modoCompacto}
              onClick={() => {
                onCambiarModoCompacto(true);
                mostrarGuardado();
              }}>
              {t.activado}
            </button>
            <button
              type="button"
              className="sc-chip"
              data-active={!modoCompacto ? 'true' : 'false'}
              aria-pressed={!modoCompacto}
              onClick={() => {
                onCambiarModoCompacto(false);
                mostrarGuardado();
              }}>
              {t.desactivado}
            </button>
          </div>
        </Seccion>

        <Seccion
          titulo={t.atajos}
          tituloId={atajosId}
          desc={t.atajosDesc}
          descId={atajosDescId}>
          <p className="m-0 whitespace-pre-line rounded-[10px] border border-white/8 bg-white/4 px-3 py-2 font-mono text-[0.7rem] leading-relaxed text-marfil/50">
            {t.atajosDetalle}
          </p>
        </Seccion>

        <Seccion titulo={t.creditos} tituloId={creditosId}>
          <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/4 px-3.5 py-3 text-[0.78rem]">
            <FilaInfo label={t.version} value={`v${pkg.version}`} />
            <FilaInfo label={t.autor} value="Cristian Castiñeiras" />
            <FilaInfo
              label={t.repositorio}
              value={
                <a
                  href="https://github.com/cristiancastineiras/SoundCloudControl"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`GitHub. ${t.abreNuevaPestana}`}
                  className="inline-flex items-center gap-1 hover:underline"
                  style={{ color: 'rgb(var(--sc-theme-rgb))' }}>
                  <GithubLogo size={13} weight="bold" />
                  GitHub
                </a>
              }
            />
          </div>
        </Seccion>
      </div>
    </div>
  );
}

// ---- Subcomponentes --------------------------------------------------------

function SelectAjuste<T extends string>(props: {
  id: string;
  labelledBy: string;
  describedBy?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative">
      <select
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value as T)}
        aria-labelledby={props.labelledBy}
        aria-describedby={props.describedBy}
        className="sc-select">
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={13}
        weight="bold"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-marfil/45"
      />
    </div>
  );
}

function SelectorColor(props: {
  valor: string;
  t: Textos;
  labelledBy: string;
  onChange: (value: string) => void;
}) {
  const { labelledBy, onChange, t, valor } = props;
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const usandoPersonalizado = !esColorPreset(valor);
  const colorBordeActivo = hoverColor ?? valor;

  return (
    <div
      className="flex flex-wrap items-center gap-2.5"
      role="group"
      aria-labelledby={labelledBy}>
      {COLORES_TEMA_PRESET.map((hex) => {
        const activo = valor.toLowerCase() === hex;

        return (
          <button
            key={hex}
            type="button"
            aria-pressed={activo}
            aria-label={`${t.colorTemaPredeterminado(hex)}. ${activo ? t.activado : t.desactivado}`}
            onClick={() => onChange(hex)}
            onMouseEnter={() => setHoverColor(hex)}
            onMouseLeave={() => setHoverColor(null)}
            className="sc-theme-swatch h-8.5 w-8.5 rounded-full border transition duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            style={{
              backgroundColor: hex,
              borderColor: activo ? colorBordeActivo : 'rgba(255, 255, 255, 0.34)',
              boxShadow: activo
                ? `0 0 0 2px rgba(0, 0, 0, 0.7), 0 0 0 4px ${hex}`
                : 'none',
            }}
          />
        );
      })}

      <label
        onMouseEnter={() => setHoverColor(valor)}
        onMouseLeave={() => setHoverColor(null)}
        className="relative h-8.5 w-8.5 cursor-pointer rounded-full border transition duration-150 hover:scale-110"
        style={{
          background: usandoPersonalizado
            ? valor
            : 'linear-gradient(135deg, #555 0%, #333 50%, #888 100%)',
          borderColor: colorBordeActivo,
          boxShadow: usandoPersonalizado
            ? `0 0 0 2px rgba(0, 0, 0, 0.7), 0 0 0 4px ${valor}`
            : 'none',
        }}>
        <span className="sr-only">
          {usandoPersonalizado ? t.colorTemaActual(valor) : t.colorTemaPersonalizado}
        </span>
        {!usandoPersonalizado && (
          <span className="absolute inset-0 flex select-none items-center justify-center text-[0.75rem] font-bold text-white">
            +
          </span>
        )}
        <input
          type="color"
          value={valor}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-label={usandoPersonalizado ? t.colorTemaActual(valor) : t.colorTemaPersonalizado}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function Seccion(props: {
  titulo: string;
  tituloId: string;
  desc?: string;
  descId?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-2"
      aria-labelledby={props.tituloId}
      aria-describedby={props.desc ? props.descId : undefined}>
      <h3 id={props.tituloId} className="sc-section-title">{props.titulo}</h3>
      {props.desc && (
        <p id={props.descId} className="sc-section-desc">{props.desc}</p>
      )}
      {props.children}
    </section>
  );
}

function FilaInfo(props: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-marfil/45">{props.label}</span>
      <span className="font-semibold text-marfil/80">{props.value}</span>
    </div>
  );
}
