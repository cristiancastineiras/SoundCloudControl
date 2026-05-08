/**
 * Cliente tipado para enviar mensajes desde el popup al background.
 * Centralizar el cast aquí impide que se cuelen `any` en el resto del popup.
 */
import type { SolicitudPopup } from './contratos';

export async function enviarSolicitudBackground<TRespuesta>(
  mensaje: SolicitudPopup,
): Promise<TRespuesta> {
  return (await browser.runtime.sendMessage(mensaje)) as TRespuesta;
}
