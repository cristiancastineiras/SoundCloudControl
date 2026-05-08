import { storage } from '#imports';
import {
  type Idioma,
  normalizarIdioma,
  obtenerIdiomaNavegador,
} from './i18n';
import {
  COLOR_TEMA_POR_DEFECTO,
  normalizarColorTema,
} from './tema';
import {
  INTERVALO_POR_DEFECTO,
  MODO_APARIENCIA_POR_DEFECTO,
  MODO_COMPACTO_POR_DEFECTO,
  esModoAparienciaValido,
  MOSTRAR_DESCARGA_MP3_POR_DEFECTO,
  MOSTRAR_SLIDER_VOLUMEN_POR_DEFECTO,
  VERSION_NOTIF_VISTA_POR_DEFECTO,
  esIntervaloValido,
  type IntervaloActualizacion,
  type ModoApariencia,
} from './preferencias';

const CLAVE_LEGACY_MIGRADA = 'local:legacy-settings-migrated';
const CLAVE_IDIOMA = 'local:idioma';
const CLAVE_TEMA = 'local:tema';
const CLAVE_INTERVALO = 'local:intervalo';
const CLAVE_MODO_APARIENCIA = 'local:modo-apariencia';
const CLAVE_MOSTRAR_DESCARGA_MP3 = 'local:mostrar-descarga-mp3';
const CLAVE_MOSTRAR_SLIDER_VOLUMEN = 'local:mostrar-slider-volumen';
const CLAVE_MODO_COMPACTO = 'local:modo-compacto';
const CLAVE_VERSION_NOTIF_VISTA = 'local:version-notif-vista';

const LEGACY_CLAVE_IDIOMA = 'sc-control-idioma';
const LEGACY_CLAVE_TEMA = 'sc-control-tema';
const LEGACY_CLAVE_INTERVALO = 'sc-control-intervalo';
const LEGACY_CLAVE_MOSTRAR_DESCARGA_MP3 = 'sc-control-mostrar-descarga-mp3';
const LEGACY_CLAVE_MODO_COMPACTO = 'sc-control-modo-compacto';
const LEGACY_CLAVE_VERSION_NOTIF_VISTA = 'sc-control-version-notif-vista';

const legacyMigradaItem = storage.defineItem<boolean>(CLAVE_LEGACY_MIGRADA, {
  fallback: false,
});

const idiomaItem = storage.defineItem<Idioma>(CLAVE_IDIOMA, {
  init: () => obtenerIdiomaNavegador(),
});

const colorTemaItem = storage.defineItem<string>(CLAVE_TEMA, {
  fallback: COLOR_TEMA_POR_DEFECTO,
});

const modoAparienciaItem = storage.defineItem<ModoApariencia>(CLAVE_MODO_APARIENCIA, {
  fallback: MODO_APARIENCIA_POR_DEFECTO,
});

const intervaloItem = storage.defineItem<IntervaloActualizacion>(CLAVE_INTERVALO, {
  fallback: INTERVALO_POR_DEFECTO,
});

const mostrarDescargaMp3Item = storage.defineItem<boolean>(CLAVE_MOSTRAR_DESCARGA_MP3, {
  fallback: MOSTRAR_DESCARGA_MP3_POR_DEFECTO,
});

const mostrarSliderVolumenItem = storage.defineItem<boolean>(CLAVE_MOSTRAR_SLIDER_VOLUMEN, {
  fallback: MOSTRAR_SLIDER_VOLUMEN_POR_DEFECTO,
});

const modoCompactoItem = storage.defineItem<boolean>(CLAVE_MODO_COMPACTO, {
  fallback: MODO_COMPACTO_POR_DEFECTO,
});

const versionNotifVistaItem = storage.defineItem<string>(CLAVE_VERSION_NOTIF_VISTA, {
  fallback: VERSION_NOTIF_VISTA_POR_DEFECTO,
});

export type PreferenciasPersistidas = {
  idioma: Idioma;
  colorTema: string;
  modoApariencia: ModoApariencia;
  intervaloActualizacion: IntervaloActualizacion;
  mostrarDescargaMp3: boolean;
  mostrarSliderVolumen: boolean;
  modoCompacto: boolean;
};

export async function migrarPreferenciasLegacy(): Promise<void> {
  if (await legacyMigradaItem.getValue()) return;

  const tareas: Promise<unknown>[] = [];

  try {
    const idiomaLegacy = localStorage.getItem(LEGACY_CLAVE_IDIOMA);
    const idiomaMigrado = normalizarIdioma(idiomaLegacy);
    if (idiomaMigrado) {
      tareas.push(idiomaItem.setValue(idiomaMigrado));
    }

    const colorLegacy = localStorage.getItem(LEGACY_CLAVE_TEMA);
    if (colorLegacy !== null) {
      tareas.push(colorTemaItem.setValue(normalizarColorTema(colorLegacy)));
    }

    const intervaloLegacy = Number(localStorage.getItem(LEGACY_CLAVE_INTERVALO));
    if (esIntervaloValido(intervaloLegacy)) {
      tareas.push(intervaloItem.setValue(intervaloLegacy));
    }

    const mostrarDescargaLegacy = localStorage.getItem(LEGACY_CLAVE_MOSTRAR_DESCARGA_MP3);
    if (mostrarDescargaLegacy === 'true' || mostrarDescargaLegacy === 'false') {
      tareas.push(mostrarDescargaMp3Item.setValue(mostrarDescargaLegacy === 'true'));
    }

    const modoCompactoLegacy = localStorage.getItem(LEGACY_CLAVE_MODO_COMPACTO);
    if (modoCompactoLegacy === 'true' || modoCompactoLegacy === 'false') {
      tareas.push(modoCompactoItem.setValue(modoCompactoLegacy === 'true'));
    }

    const versionNotifLegacy = localStorage.getItem(LEGACY_CLAVE_VERSION_NOTIF_VISTA);
    if (versionNotifLegacy) {
      tareas.push(versionNotifVistaItem.setValue(versionNotifLegacy));
    }
  } catch {
    // Si localStorage no está accesible, simplemente omitimos la migración.
  }

  await Promise.all(tareas);
  await legacyMigradaItem.setValue(true);
}

export async function cargarPreferenciasPersistidas(): Promise<PreferenciasPersistidas> {
  await migrarPreferenciasLegacy();

  const [idioma, colorTema, modoApariencia, intervaloActualizacion, mostrarDescargaMp3, mostrarSliderVolumen, modoCompacto] = await Promise.all([
    idiomaItem.getValue(),
    colorTemaItem.getValue(),
    modoAparienciaItem.getValue(),
    intervaloItem.getValue(),
    mostrarDescargaMp3Item.getValue(),
    mostrarSliderVolumenItem.getValue(),
    modoCompactoItem.getValue(),
  ]);

  return {
    idioma: normalizarIdioma(idioma) ?? obtenerIdiomaNavegador(),
    colorTema: normalizarColorTema(colorTema),
    modoApariencia: esModoAparienciaValido(modoApariencia)
      ? modoApariencia
      : MODO_APARIENCIA_POR_DEFECTO,
    intervaloActualizacion: esIntervaloValido(intervaloActualizacion)
      ? intervaloActualizacion
      : INTERVALO_POR_DEFECTO,
    mostrarDescargaMp3,
    mostrarSliderVolumen,
    modoCompacto,
  };
}

export async function leerIdioma(): Promise<Idioma> {
  await migrarPreferenciasLegacy();
  return normalizarIdioma(await idiomaItem.getValue()) ?? obtenerIdiomaNavegador();
}

export async function guardarIdioma(idioma: Idioma): Promise<void> {
  await idiomaItem.setValue(idioma);
}

export async function leerColorTema(): Promise<string> {
  await migrarPreferenciasLegacy();
  return normalizarColorTema(await colorTemaItem.getValue());
}

export async function guardarColorTema(color: string): Promise<void> {
  await colorTemaItem.setValue(normalizarColorTema(color));
}

export async function leerModoApariencia(): Promise<ModoApariencia> {
  await migrarPreferenciasLegacy();
  const valor = await modoAparienciaItem.getValue();
  return esModoAparienciaValido(valor) ? valor : MODO_APARIENCIA_POR_DEFECTO;
}

export async function guardarModoApariencia(modoApariencia: ModoApariencia): Promise<void> {
  await modoAparienciaItem.setValue(modoApariencia);
}

export async function leerIntervalo(): Promise<IntervaloActualizacion> {
  await migrarPreferenciasLegacy();
  const valor = await intervaloItem.getValue();
  return esIntervaloValido(valor) ? valor : INTERVALO_POR_DEFECTO;
}

export async function guardarIntervalo(intervalo: IntervaloActualizacion): Promise<void> {
  await intervaloItem.setValue(intervalo);
}

export async function leerMostrarDescargaMp3(): Promise<boolean> {
  await migrarPreferenciasLegacy();
  return mostrarDescargaMp3Item.getValue();
}

export async function guardarMostrarDescargaMp3(mostrar: boolean): Promise<void> {
  await mostrarDescargaMp3Item.setValue(mostrar);
}

export async function leerMostrarSliderVolumen(): Promise<boolean> {
  await migrarPreferenciasLegacy();
  return mostrarSliderVolumenItem.getValue();
}

export async function guardarMostrarSliderVolumen(mostrar: boolean): Promise<void> {
  await mostrarSliderVolumenItem.setValue(mostrar);
}

export async function leerModoCompacto(): Promise<boolean> {
  await migrarPreferenciasLegacy();
  return modoCompactoItem.getValue();
}

export async function guardarModoCompacto(compacto: boolean): Promise<void> {
  await modoCompactoItem.setValue(compacto);
}

export async function leerVersionNotifVista(): Promise<string> {
  await migrarPreferenciasLegacy();
  return versionNotifVistaItem.getValue();
}

export async function guardarVersionNotifVista(version: string): Promise<void> {
  await versionNotifVistaItem.setValue(version);
}