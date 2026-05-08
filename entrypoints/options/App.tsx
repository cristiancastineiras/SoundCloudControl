import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { type Idioma, TEXTOS } from '../popup/i18n';
import {
  hexARgb,
  normalizarColorTema,
  rgbATripleta,
} from '../popup/tema';
import {
  type IntervaloActualizacion,
  type ModoApariencia,
} from '../popup/preferencias';
import {
  guardarColorTema,
  guardarIdioma,
  guardarIntervalo,
  guardarModoApariencia,
  guardarModoCompacto,
  guardarMostrarDescargaMp3,
  guardarMostrarSliderVolumen,
  type PreferenciasPersistidas,
} from '../popup/storage';
import { aplicarModoAparienciaDocumento } from '../popup/documento';
import { PantallaAjustes } from '../popup/componentes/PantallaAjustes';

export default function OpcionesApp(props: { preferenciasIniciales: PreferenciasPersistidas }) {
  const { preferenciasIniciales } = props;

  const [idioma, setIdioma] = useState<Idioma>(preferenciasIniciales.idioma);
  const [colorTema, setColorTema] = useState(preferenciasIniciales.colorTema);
  const [modoApariencia, setModoApariencia] = useState<ModoApariencia>(preferenciasIniciales.modoApariencia);
  const [mostrarDescargaMp3, setMostrarDescargaMp3] = useState(preferenciasIniciales.mostrarDescargaMp3);
  const [mostrarSliderVolumen, setMostrarSliderVolumen] = useState(preferenciasIniciales.mostrarSliderVolumen);
  const [intervaloActualizacion, setIntervaloActualizacion] =
    useState<IntervaloActualizacion>(preferenciasIniciales.intervaloActualizacion);
  const [modoCompacto, setModoCompacto] = useState(preferenciasIniciales.modoCompacto);

  const t = TEXTOS[idioma];

  useEffect(() => {
    document.documentElement.lang = idioma;
    document.title = `${t.ajustes} | ${t.appNombre}`;
  }, [idioma, t]);

  useEffect(() => {
    aplicarModoAparienciaDocumento(modoApariencia);
  }, [modoApariencia]);

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

  function cambiarModoApariencia(nuevoModo: ModoApariencia) {
    void guardarModoApariencia(nuevoModo);
    setModoApariencia(nuevoModo);
  }

  function cambiarIntervalo(nuevo: IntervaloActualizacion) {
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
          modoApariencia={modoApariencia}
          mostrarDescargaMp3={mostrarDescargaMp3}
          mostrarSliderVolumen={mostrarSliderVolumen}
          modoCompacto={modoCompacto}
          intervalo={intervaloActualizacion}
          onVolver={() => window.close()}
          onCambiarIdioma={cambiarIdioma}
          onCambiarColor={cambiarColorTema}
          onCambiarModoApariencia={cambiarModoApariencia}
          onCambiarMostrarDescargaMp3={cambiarMostrarDescargaMp3}
          onCambiarMostrarSliderVolumen={cambiarMostrarSliderVolumen}
          onCambiarModoCompacto={cambiarModoCompacto}
          onCambiarIntervalo={cambiarIntervalo}
        />
      </div>
    </div>
  );
}
