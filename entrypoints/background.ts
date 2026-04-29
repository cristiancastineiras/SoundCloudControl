import {
  ACCIONES_POR_COMANDO,
  crearRespuestaPopup,
  PATRONES_SOUNDCLOUD,
  URL_BASE_SOUNDCLOUD,
  esComandoRapido,
  esSolicitudPopup,
  type AccionReproductor,
  type EstadoCancion,
  type RespuestaPopup,
  type SolicitudContenido,
  type SolicitudPopup,
} from '../lib/contratos';

const TIEMPO_ESPERA_PESTANA_MS = 12_000;
type PestanaSoundCloud = Browser.tabs.Tab;

export default defineBackground(() => {
  console.log('[BG] background arrancado');

  browser.runtime.onInstalled.addListener(() => {
    console.log('[BG] onInstalled → inyectando content script en tabs SC ya abiertas');
    void inyectarEnTabsExistentes();
  });

  browser.commands.onCommand.addListener((comando) => {
    console.log('[BG] comando recibido:', comando);
    if (!esComandoRapido(comando)) {
      return;
    }

    void ejecutarComandoRapido(comando);
  });

  browser.runtime.onMessage.addListener((mensaje, remitente, enviarRespuesta) => {
    console.log('[BG] mensaje recibido:', mensaje, '| remitente:', remitente);
    if (!esSolicitudPopup(mensaje)) {
      console.log('[BG] mensaje descartado (no es SolicitudPopup)');
      return;
    }

    void gestionarSolicitudPopup(mensaje).then((respuesta) => {
      console.log('[BG] respuesta para popup:', respuesta);
      enviarRespuesta(respuesta);
    }).catch((err: unknown) => {
      console.error('[BG] error gestionando solicitud popup:', err);
    });
    return true;
  });
});

async function ejecutarComandoRapido(comando: keyof typeof ACCIONES_POR_COMANDO) {
  const accion = ACCIONES_POR_COMANDO[comando];
  const pestana = await asegurarPestanaSoundCloud({
    activar: true,
    crearSiNoExiste: true,
  });

  if (!pestana?.id) {
    return;
  }

  try {
    await enviarSolicitudContenido(pestana.id, {
      canal: 'soundcloud-control',
      tipo: accion,
    });
  } catch {
    return;
  }
}

async function gestionarSolicitudPopup(
  solicitud: SolicitudPopup,
): Promise<RespuestaPopup> {
  switch (solicitud.tipo) {
    case 'obtener-estado':
      return obtenerEstadoActual();
    case 'ejecutar-accion':
      return ejecutarAccionDesdePopup(solicitud.accion);
    case 'ajustar-volumen':
      return ajustarVolumenDesdePopup(solicitud.volumen);
    case 'abrir-soundcloud':
      await asegurarPestanaSoundCloud({ activar: true, crearSiNoExiste: true });
      return crearRespuestaPopup(
        'cargando',
        null,
        'SoundCloud se está abriendo en una pestaña activa.',
      );
    case 'abrir-enlace':
      await abrirEnlaceEnPestanaObjetivo(solicitud.url);
      return crearRespuestaPopup(
        'cargando',
        null,
        'Se está abriendo la vista solicitada en SoundCloud.',
      );
    default:
      return crearRespuestaPopup(
        'error',
        null,
        'La acción solicitada no está soportada por la extensión.',
      );
  }
}

async function obtenerEstadoActual(): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });

  console.log('[BG] pestaña SC encontrada:', pestana ? `id=${pestana.id} status=${pestana.status} url=${pestana.url}` : 'ninguna');

  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'No hay ninguna pestaña de SoundCloud abierta.',
    );
  }

  try {
    console.log('[BG] enviando obtener-estado al content script tab', pestana.id);
    const cancion = await enviarSolicitudContenido(pestana.id, {
      canal: 'soundcloud-control',
      tipo: 'obtener-estado',
    });

    console.log('[BG] respuesta del content script:', cancion);

    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'La pestaña está abierta, pero el reproductor todavía no está disponible.',
      );
    }

    return crearRespuestaPopup('disponible', cancion, 'Control listo.');
  } catch (err) {
    console.error('[BG] error enviando al content script:', err, '| status pestana:', pestana.status);
    return crearRespuestaPopup(
      pestana.status === 'complete' ? 'sin-reproductor' : 'cargando',
      null,
      pestana.status === 'complete'
        ? 'No se ha podido leer el reproductor de SoundCloud en esta pestaña.'
        : 'SoundCloud todavía se está cargando.',
    );
  }
}

async function ejecutarAccionDesdePopup(
  accion: AccionReproductor,
): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });

  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'Abre SoundCloud para poder usar los controles.',
    );
  }

  try {
    const cancion = await enviarSolicitudContenido(pestana.id, {
      canal: 'soundcloud-control',
      tipo: accion,
    });

    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'El reproductor no está listo para ejecutar esa acción.',
      );
    }

    return crearRespuestaPopup('disponible', cancion, 'Control actualizado.');
  } catch {
    return crearRespuestaPopup(
      'error',
      null,
      'No se ha podido enviar la acción al reproductor de SoundCloud.',
    );
  }
}

async function ajustarVolumenDesdePopup(volumen: number): Promise<RespuestaPopup> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });

  if (!pestana?.id) {
    return crearRespuestaPopup(
      'sin-pestana',
      null,
      'Abre SoundCloud para poder ajustar el volumen.',
    );
  }

  try {
    const cancion = await enviarSolicitudContenido(pestana.id, {
      canal: 'soundcloud-control',
      tipo: 'ajustar-volumen',
      volumen,
    });

    if (!cancion) {
      return crearRespuestaPopup(
        'sin-reproductor',
        null,
        'No se ha encontrado el reproductor para cambiar el volumen.',
      );
    }

    return crearRespuestaPopup('disponible', cancion, 'Volumen actualizado.');
  } catch {
    return crearRespuestaPopup(
      'error',
      null,
      'No se ha podido ajustar el volumen de SoundCloud.',
    );
  }
}

async function abrirEnlaceEnPestanaObjetivo(url: string) {
  const pestana = await asegurarPestanaSoundCloud({
    activar: true,
    crearSiNoExiste: true,
  });

  if (!pestana?.id) {
    await browser.tabs.create({ url, active: true });
    return;
  }

  await browser.tabs.update(pestana.id, {
    active: true,
    url,
  });
}

async function asegurarPestanaSoundCloud(opciones: {
  activar: boolean;
  crearSiNoExiste: boolean;
}) {
  const pestanas = await browser.tabs.query({
    url: [...PATRONES_SOUNDCLOUD],
    discarded: false,
  });

  const objetivo = seleccionarPestanaObjetivo(pestanas);

  if (!objetivo) {
    if (!opciones.crearSiNoExiste) {
      return null;
    }

    return browser.tabs.create({
      url: URL_BASE_SOUNDCLOUD,
      active: opciones.activar,
    });
  }

  if (opciones.activar && objetivo.id) {
    return browser.tabs.update(objetivo.id, { active: true });
  }

  return objetivo;
}

function seleccionarPestanaObjetivo(tabs: PestanaSoundCloud[]) {
  return [...tabs].sort((izquierda, derecha) => {
    const prioridadIzquierda = calcularPrioridadPestana(izquierda);
    const prioridadDerecha = calcularPrioridadPestana(derecha);

    return prioridadDerecha - prioridadIzquierda;
  })[0] ?? null;
}

function calcularPrioridadPestana(tab: PestanaSoundCloud) {
  return [
    tab.audible ? 4 : 0,
    tab.active ? 2 : 0,
    tab.lastAccessed ?? 0,
  ].reduce((total, valor) => total + valor, 0);
}

async function inyectarEnTabsExistentes() {
  const tabs = await browser.tabs.query({ url: [...PATRONES_SOUNDCLOUD] });
  console.log('[BG] tabs SC existentes encontrados:', tabs.length);
  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/content.js'],
      });
      console.log('[BG] content script inyectado OK en tab', tab.id, tab.url);
    } catch (err) {
      console.warn('[BG] fallo al inyectar en tab', tab.id, ':', err);
    }
  }
}

async function inyectarContentScript(tabId: number) {
  console.log('[BG] inyectando content script dinámicamente en tab', tabId);
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });
    console.log('[BG] inyección dinámica OK en tab', tabId);
  } catch (err) {
    console.warn('[BG] inyección falló (puede que ya esté cargado):', err);
  }
  await esperar(250);
}

function esperar(ms: number) {
  return new Promise<void>((resolver) => setTimeout(resolver, ms));
}

async function enviarSolicitudContenido(
  tabId: number,
  solicitud: SolicitudContenido,
): Promise<EstadoCancion | null> {
  try {
    console.log('[BG] tabs.sendMessage ->', tabId, solicitud.tipo);
    const res = (await browser.tabs.sendMessage(tabId, solicitud)) as EstadoCancion | null;
    console.log('[BG] tabs.sendMessage respuesta:', res);
    return res;
  } catch (err) {
    console.warn('[BG] sendMessage falló → inyectando content script y reintentando:', err);
    await inyectarContentScript(tabId);
    console.log('[BG] reintento sendMessage ->', tabId, solicitud.tipo);
    const res = (await browser.tabs.sendMessage(tabId, solicitud)) as EstadoCancion | null;
    console.log('[BG] reintento respuesta:', res);
    return res;
  }
}

async function esperarPestanaLista(tabId: number) {
  const pestana = await browser.tabs.get(tabId);

  if (pestana.status === 'complete') {
    return;
  }

  await new Promise<void>((resolver, rechazar) => {
    const alActualizarPestana = (
      idPestanaActualizada: number,
      informacion: { status?: string },
    ) => {
      if (idPestanaActualizada !== tabId || informacion.status !== 'complete') {
        return;
      }

      clearTimeout(temporizador);
      browser.tabs.onUpdated.removeListener(alActualizarPestana);
      resolver();
    };

    const temporizador = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(alActualizarPestana);
      rechazar(new Error('Tiempo de espera agotado para SoundCloud.'));
    }, TIEMPO_ESPERA_PESTANA_MS);

    browser.tabs.onUpdated.addListener(alActualizarPestana);
  });
}
