import {
  ArrowLeft,
  CaretDown,
  GearSix,
  GithubLogo,
  Heart,
} from '@phosphor-icons/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import pkg from '../../../package.json';
import { type Idioma, type Textos } from '../i18n';

const CLAVE_INTERVALO = 'sc-control-intervalo';

function leerIntervalo(): number {
  try {
    const valor = localStorage.getItem(CLAVE_INTERVALO);
    const numero = Number(valor);
    return [2000, 4000, 8000].includes(numero) ? numero : 4000;
  } catch {
    return 4000;
  }
}

function guardarIntervalo(ms: number) {
  try {
    localStorage.setItem(CLAVE_INTERVALO, String(ms));
  } catch {
    // sin acceso a localStorage
  }
}

const COLORES_PRESET = [
  '#ff7700',
  '#e04040',
  '#a855f7',
  '#3b82f6',
  '#22c55e',
  '#eab308',
] as const;

const ESTILO_FONDO_AJUSTES: CSSProperties = {
  background:
    'radial-gradient(circle at top right, rgb(var(--sc-theme-rgb) / 0.16), transparent 38%), linear-gradient(180deg, rgba(20, 20, 18, 0.96) 0%, rgba(14, 13, 12, 0.98) 100%)',
};

function SelectAjuste<T extends string>(props: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative">
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as T)}
        className="w-full appearance-none rounded-[10px] border border-white/10 bg-white/6 py-2.5 pl-3.5 pr-9 text-[0.82rem] font-semibold text-marfil transition duration-150 hover:border-white/22 focus:border-[#ffc28c]/50 focus:outline-none cursor-pointer"
        style={{ backgroundImage: 'none' }}>
        {props.options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#1c1a18] text-marfil">
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

function SelectorColor(props: { valor: string; onChange: (value: string) => void }) {
  const { onChange, valor } = props;
  const esPreset = COLORES_PRESET.includes(valor as (typeof COLORES_PRESET)[number]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {COLORES_PRESET.map((hex) => {
        const activo = valor.toLowerCase() === hex;

        return (
          <button
            key={hex}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(hex)}
            className="h-7 w-7 rounded-full transition duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            style={{
              backgroundColor: hex,
              boxShadow: activo ? `0 0 0 2px rgba(0, 0, 0, 0.7), 0 0 0 4px ${hex}` : 'none',
            }}
          />
        );
      })}

      <label
        title="Pick theme color"
        aria-label="Pick theme color"
        className="relative h-7 w-7 cursor-pointer rounded-full transition duration-150 hover:scale-110"
        style={{
          background: esPreset
            ? 'linear-gradient(135deg, #555 0%, #333 50%, #888 100%)'
            : valor,
          boxShadow: !esPreset ? `0 0 0 2px rgba(0, 0, 0, 0.7), 0 0 0 4px ${valor}` : 'none',
        }}>
        {esPreset && (
          <span className="absolute inset-0 flex select-none items-center justify-center text-[0.75rem] font-bold text-white/70">
            +
          </span>
        )}
        <input
          type="color"
          value={valor}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

export function BotonAjustes(props: { t: Textos; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props.t.ajustes}
      onClick={props.onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-marfil/70 transition duration-150 hover:border-white/30 hover:text-marfil">
      <GearSix size={16} weight="bold" />
    </button>
  );
}

export function PantallaAjustes(props: {
  idioma: Idioma;
  t: Textos;
  colorTema: string;
  onVolver: () => void;
  onCambiarIdioma: (idioma: Idioma) => void;
  onCambiarColor: (color: string) => void;
}) {
  const { colorTema, idioma, onCambiarColor, onCambiarIdioma, onVolver, t } = props;
  const [intervalo, setIntervalo] = useState(leerIntervalo);
  const [guardado, setGuardado] = useState(false);
  const estiloChipActivo: CSSProperties = {
    borderColor: 'rgb(var(--sc-theme-rgb) / 0.60)',
    backgroundImage:
      'linear-gradient(180deg, rgb(var(--sc-theme-rgb) / 0.28), rgb(var(--sc-theme-rgb) / 0.10))',
    boxShadow: '0 0 0 1px rgb(var(--sc-theme-rgb) / 0.14)',
    color: '#fff7f1',
  };
  const estiloEnlaceTema: CSSProperties = {
    color: 'rgb(var(--sc-theme-rgb))',
  };

  useEffect(() => {
    if (!guardado) return;
    const id = setTimeout(() => setGuardado(false), 1500);
    return () => clearTimeout(id);
  }, [guardado]);

  function mostrarGuardado() {
    setGuardado(true);
  }

  function aplicarIntervalo(ms: number) {
    setIntervalo(ms);
    guardarIntervalo(ms);
    mostrarGuardado();
  }

  function aplicarColor(color: string) {
    onCambiarColor(color);
    mostrarGuardado();
  }

  const opcionesIdioma = [
    { value: 'es' as Idioma, label: `${t.idiomaEspanol}` },
    { value: 'en' as Idioma, label: `${t.idiomaIngles}` },
  ] as const;

  const claseChipIntervalo = (activo: boolean) =>
    `flex-1 rounded-[10px] border py-2 text-[0.78rem] font-semibold transition duration-150 ${ activo ? 'text-marfil' : 'border-white/8 bg-white/5 text-marfil/50 hover:text-marfil/75 hover:border-white/18' }`;

  return (
    <div
      className="relative z-10 flex flex-col px-4 pb-5 pt-4"
      style={ESTILO_FONDO_AJUSTES}>
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          aria-label={t.volver}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/6 text-marfil/70 transition hover:border-white/25 hover:text-marfil">
          <ArrowLeft size={15} weight="bold" />
        </button>
        <h1 className="m-0 text-[0.95rem] font-bold tracking-tight text-marfil">
          {t.ajustes}
        </h1>
        {guardado && (
          <span className="ml-auto text-[0.72rem] font-semibold text-bosque-400/90">
            OK {t.guardado}
          </span>
        )}
      </header>

      <div className="flex flex-col gap-5 pr-1">
        <Seccion titulo={t.idiomaLabel}>
          <SelectAjuste
            value={idioma}
            options={opcionesIdioma}
            onChange={(value) => {
              onCambiarIdioma(value);
              mostrarGuardado();
            }}
          />
        </Seccion>

        <Seccion titulo={t.intervaloActualizacion} desc={t.intervaloDesc}>
          <div className="flex gap-2">
            {([2000, 4000, 8000] as const).map((ms) => (
              <button
                key={ms}
                type="button"
                className={claseChipIntervalo(intervalo === ms)}
                style={intervalo === ms ? estiloChipActivo : undefined}
                onClick={() => aplicarIntervalo(ms)}>
                {ms === 2000 ? t.seg2 : ms === 4000 ? t.seg4 : t.seg8}
              </button>
            ))}
          </div>
        </Seccion>

        <Seccion titulo={t.tema}>
          <SelectorColor valor={colorTema} onChange={aplicarColor} />
        </Seccion>

        <Seccion titulo={t.atajos} desc={t.atajosDesc}>
          <p className="m-0 rounded-[10px] border border-white/8 bg-white/4 px-3 py-2 font-mono text-[0.7rem] leading-relaxed text-marfil/50">
            {t.atajosDetalle}
          </p>
        </Seccion>

        <Seccion titulo={t.creditos}>
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
                  className="inline-flex items-center gap-1 hover:underline"
                  style={estiloEnlaceTema}>
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

function Seccion(props: {
  titulo: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-marfil/40">
        {props.titulo}
      </p>
      {props.desc && (
        <p className="m-0 text-[0.74rem] leading-snug text-marfil/40">{props.desc}</p>
      )}
      {props.children}
    </div>
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
