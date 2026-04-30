export type Idioma = 'es' | 'en';

const CLAVE_STORAGE = 'sc-control-idioma';

export function obtenerIdioma(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    if (guardado === 'es' || guardado === 'en') return guardado;
    const navegador = navigator.language.slice(0, 2).toLowerCase();
    return navegador === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function guardarIdioma(idioma: Idioma) {
  try {
    localStorage.setItem(CLAVE_STORAGE, idioma);
  } catch {
    // sin acceso a localStorage
  }
}

export const TEXTOS = {
  es: {
    // general
    appNombre: 'SoundCloud Control',
    cargando: 'Buscando una pestaña de SoundCloud...',
    errorComunicacion: 'No se ha podido comunicar el popup con el background.',
    errorAccion: 'La acción no se ha podido completar correctamente.',

    // estados
    estadoActivo: 'Activo',
    estadoSinPestana: 'Sin pestaña',
    estadoSinReproductor: 'Sin reproductor',
    estadoCargando: 'Cargando',
    estadoError: 'Error',

    // acciones estado
    abrirSoundCloud: 'Abrir SoundCloud',
    reintentar: 'Reintentar',

    // controles
    pistaAnterior: 'Pista anterior',
    pausar: 'Pausar',
    reproducir: 'Reproducir',
    siguientePista: 'Siguiente pista',
    alternarAleatorio: 'Alternar modo aleatorio',
    alternarRepeticionLista: 'Alternar repetición de lista',
    alternarRepeticionPista: 'Alternar repetición de pista',
    quitarMeGusta: 'Quitar me gusta',
    marcarMeGusta: 'Marcar me gusta',
    activarSonido: 'Activar sonido',
    silenciarSonido: 'Silenciar sonido',
    volumen: 'Volumen',

    // portada
    portadaSoundCloud: 'Portada de SoundCloud',
    portadaDe: (titulo: string, artista: string) => `Portada de ${titulo} de ${artista}`,
    sinArtista: 'Sin artista disponible',

    // ajustes
    ajustes: 'Ajustes',
    volver: 'Volver',
    idiomaLabel: 'Idioma',
    idiomaEspanol: 'Español',
    idiomaIngles: 'English',
    intervaloActualizacion: 'Intervalo de actualización',
    intervaloDesc: 'Cada cuántos segundos se refresca el estado.',
    seg2: '2 s',
    seg4: '4 s  (por defecto)',
    seg8: '8 s',
    abrirEnPestana: 'Abrir SoundCloud al ejecutar atajos',
    abrirEnPestanaDesc: 'Si está activado, al usar los atajos de teclado SoundCloud se abrirá si no hay pestaña activa.',
    creditos: 'Créditos',
    version: 'Versión',
    autor: 'Autor',
    repositorio: 'Repositorio',
    hecho: 'Hecho con',
    atajos: 'Atajos de teclado',
    atajosDesc: 'Puedes modificar los atajos desde la página de extensiones del navegador.',
    atajosDetalle: 'Ctrl+Shift+5 · Anterior   |   Ctrl+Shift+6 · Play/Pause   |   Ctrl+Shift+7 · Siguiente',
    tema: 'Tema de color',
    temaNaranja: 'Naranja (por defecto)',
    guardado: 'Guardado',
  },
  en: {
    appNombre: 'SoundCloud Control',
    cargando: 'Looking for a SoundCloud tab...',
    errorComunicacion: 'Could not communicate popup with background.',
    errorAccion: 'The action could not be completed.',

    estadoActivo: 'Active',
    estadoSinPestana: 'No tab',
    estadoSinReproductor: 'No player',
    estadoCargando: 'Loading',
    estadoError: 'Error',

    abrirSoundCloud: 'Open SoundCloud',
    reintentar: 'Retry',

    pistaAnterior: 'Previous track',
    pausar: 'Pause',
    reproducir: 'Play',
    siguientePista: 'Next track',
    alternarAleatorio: 'Toggle shuffle',
    alternarRepeticionLista: 'Toggle repeat list',
    alternarRepeticionPista: 'Toggle repeat track',
    quitarMeGusta: 'Remove like',
    marcarMeGusta: 'Like',
    activarSonido: 'Unmute',
    silenciarSonido: 'Mute',
    volumen: 'Volume',

    portadaSoundCloud: 'SoundCloud artwork',
    portadaDe: (titulo: string, artista: string) => `${titulo} by ${artista}`,
    sinArtista: 'No artist available',

    ajustes: 'Settings',
    volver: 'Back',
    idiomaLabel: 'Language',
    idiomaEspanol: 'Español',
    idiomaIngles: 'English',
    intervaloActualizacion: 'Update interval',
    intervaloDesc: 'How often the player state refreshes.',
    seg2: '2 s',
    seg4: '4 s  (default)',
    seg8: '8 s',
    abrirEnPestana: 'Open SoundCloud on shortcut',
    abrirEnPestanaDesc: 'When enabled, using keyboard shortcuts will open SoundCloud if no active tab is found.',
    creditos: 'Credits',
    version: 'Version',
    autor: 'Author',
    repositorio: 'Repository',
    hecho: 'Made with',
    atajos: 'Keyboard shortcuts',
    atajosDesc: 'You can change shortcuts from the browser extensions page.',
    atajosDetalle: 'Ctrl+Shift+5 · Previous   |   Ctrl+Shift+6 · Play/Pause   |   Ctrl+Shift+7 · Next',
    tema: 'Color theme',
    temaNaranja: 'Orange (default)',
    guardado: 'Saved',
  },
} satisfies Record<Idioma, object>;

export type Textos = (typeof TEXTOS)[Idioma];
