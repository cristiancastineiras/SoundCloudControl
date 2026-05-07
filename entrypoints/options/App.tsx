import { useMemo, useState, useEffect, type CSSProperties } from 'react';
import { type Idioma, TEXTOS, guardarIdioma, obtenerIdioma } from '../popup/i18n';
import {
  guardarColorTema,
  hexARgb,
  leerColorTema,
  normalizarColorTema,
  rgbATripleta,
} from '../popup/tema';
import {
  guardarIntervalo,
  guardarModoCompacto,
  guardarMostrarDescargaMp3,
  leerIntervalo,
  leerModoCompacto,
  leerMostrarDescargaMp3,
  type IntervaloActualizacion,
} from '../popup/preferencias';
import { PantallaAjustes } from '../popup/componentes/PantallaAjustes';

export default function OpcionesApp() {
  const [idioma, setIdioma] = useState<Idioma>(obtenerIdioma);
  const [colorTema, setColorTema] = useState(leerColorTema);
  const [mostrarDescargaMp3, setMostrarDescargaMp3] = useState(leerMostrarDescargaMp3);
  const [intervaloActualizacion, setIntervaloActualizacion] =
    useState<IntervaloActualizacion>(leerIntervalo);
  const [modoCompacto, setModoCompacto] = useState(leerModoCompacto);

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
    guardarIdioma(nuevoIdioma);
    setIdioma(nuevoIdioma);
  }

  function cambiarColorTema(nuevoColor: string) {
    const normalizado = normalizarColorTema(nuevoColor);
    guardarColorTema(normalizado);
    setColorTema(normalizado);
  }

  function cambiarIntervalo(nuevo: IntervaloActualizacion) {
    guardarIntervalo(nuevo);
    setIntervaloActualizacion(nuevo);
  }

  function cambiarMostrarDescargaMp3(mostrar: boolean) {
    guardarMostrarDescargaMp3(mostrar);
    setMostrarDescargaMp3(mostrar);
  }

  function cambiarModoCompacto(compacto: boolean) {
    guardarModoCompacto(compacto);
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
