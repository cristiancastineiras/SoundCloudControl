/**
 * Inyección de content scripts en pestañas existentes y envío de mensajes
 * con reintento automático.
 */
import { esperar, crearLogger } from '@/shared';
import type { SolicitudContenido } from '@/services/mensajeria';
import { listarPestanasSoundCloud } from './pestanas';

const ARCHIVO_CONTENT_SCRIPT = '/content-scripts/content.js';
const ARCHIVO_CONTENT_SCRIPT_MAIN = '/equalizer-main.js';

const log = crearLogger('infra.inyeccion');

export async function inyectarEnTabsExistentes() {
  const tabs = await listarPestanasSoundCloud();
  log.info('inyectar-tabs-existentes', { total: tabs.length });

  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      await inyectarContentScript(tab.id);
    } catch (err) {
      log.warn('inyectar-fallo', { tabId: tab.id, error: err });
    }
  }
}

export async function inyectarContentScript(tabId: number) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: [ARCHIVO_CONTENT_SCRIPT_MAIN],
      world: 'MAIN',
    });
  } catch (err) {
    log.warn('inyectar-main-fallo', { tabId, error: err });
  }

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: [ARCHIVO_CONTENT_SCRIPT],
    });
  } catch (err) {
    log.warn('inyectar-isolated-fallo', { tabId, error: err });
  }

  await esperar(250);
}

/**
 * Envía una solicitud al content script. Si la pestaña aún no tiene el script
 * cargado, lo inyecta y reintenta una vez.
 */
export async function enviarSolicitudContenido<TRespuesta>(
  tabId: number,
  solicitud: SolicitudContenido,
): Promise<TRespuesta> {
  try {
    return (await browser.tabs.sendMessage(tabId, solicitud)) as TRespuesta;
  } catch (err) {
    log.warn('send-message-fallo-reinyectando', { tabId, tipo: solicitud.tipo, error: err });
    await inyectarContentScript(tabId);
    return (await browser.tabs.sendMessage(tabId, solicitud)) as TRespuesta;
  }
}
