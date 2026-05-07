import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { type Idioma, TEXTOS } from '../popup/i18n';
import {
  hexARgb,
  normalizarColorTema,
  rgbATripleta,
} from '../popup/tema';
import {
  type IntervaloActualizacion,
} from '../popup/preferencias';
import {
  guardarColorTema,
  guardarIdioma,
  guardarIntervalo,
  guardarModoCompacto,
  guardarMostrarDescargaMp3,
  type PreferenciasPersistidas,
} from '../popup/storage';
import { PantallaAjustes } from '../popup/componentes/PantallaAjustes';

export default function OpcionesApp(props: { preferenciasIniciales: PreferenciasPersistidas }) {
  const { preferenciasIniciales } = props;

  const [idioma, setIdioma] = useState<Idioma>(preferenciasIniciales.idioma);
  const [colorTema, setColorTema] = useState(preferenciasIniciales.colorTema);
  const [mostrarDescargaMp3, setMostrarDescargaMp3] = useState(preferenciasIniciales.mostrarDescargaMp3);
  const [intervaloActualizacion, setIntervaloActualizacion] =
    useState<IntervaloActualizacion>(preferenciasIniciales.intervaloActualizacion);
  const [modoCompacto, setModoCompacto] = useState(preferenciasIniciales.modoCompacto);

  const t = TEXTOS[idioma];

  useEffect(() => {
    document.documentElement.lang = idioma;
    document.title = `${t.ajustes} | ${t.appNombre}`;
  }, [idioma, t]);

  const variablesTema = useMemo<CSSProperties>(() => {
    const rgb = hexARgb(colorTema);
    return { ['--sc-theme-rgb' as string]: rgbATripleta(rgb) } as CSSProperties;
  }, [colorTema]);

  function cambiarIdioma(nuevoIdioma: Idioma) {
    void guardarIdioma(nuevoIdioma);
    setIdioma(nuevoIdioma);
  }

  function cambiarColorTema(nuevoColor: string) {
    const normalizado = normalizarColorTema(nuevoColor);
    void guardarColorTema(normalizado);
    setColorTema(normalizado);
  }

  function cambiarIntervalo(nuevo: IntervaloActualizacion) {
    void guardarIntervalo(nuevo);
    setIntervaloActualizacion(nuevo);
  }

  function cambiarMostrarDescargaMp3(mostrar: boolean) {
    void guardarMostrarDescargaMp3(mostrar);
    setMostrarDescargaMp3(mostrar);
  }

  function cambiarModoCompacto(compacto: boolean) {
    void guardarModoCompacto(compacto);
    setModoCompacto(compacto);
  }

  return (
    <div className="sc-theme-ui min-h-screen" style={variablesTema}>
      <div className="mx-auto max-w-md py-4">
        <PantallaAjustes
          panelId="sc-options-panel"
          ayudaId="sc-options-help"
          idioma={idioma}
          t={t}
          colorTema={colorTema}
          mostrarDescargaMp3={mostrarDescargaMp3}
          modoCompacto={modoCompacto}
          intervalo={intervaloActualizacion}
          onVolver={() => window.close()}
          onCambiarIdioma={cambiarIdioma}
          onCambiarColor={cambiarColorTema}
          onCambiarMostrarDescargaMp3={cambiarMostrarDescargaMp3}
          onCambiarModoCompacto={cambiarModoCompacto}
          onCambiarIntervalo={cambiarIntervalo}
        />
      </div>
    </div>
  );
}
