/**
 * Orquestador de descargas: prueba estrategias en orden.
 *   1. Desde la página (HLS, mejor calidad y respeta sesión).
 *   2. btch-downloader (servicio externo, fallback rápido).
 *   3. api-v2.soundcloud.com con el client_id extraído de la página.
 *   4. Servicio web soundclouddownloader.io (abre pestaña, último recurso).
 */
import type { RespuestaDescarga } from '@/services/mensajeria';
import { asegurarPestanaSoundCloud } from '@/infrastructure';
import { crearLogger } from '@/shared';
import { descargarDesdePaginaSoundCloud } from './desde-pagina';
import { descargarViaBtch } from './via-btch';
import { descargarViaSoundCloudApi } from './via-api-sc';
import { descargarViaServicioWeb } from './via-web-service';

const log = crearLogger('descarga.orquestador');

export async function gestionarDescargaCancion(
  urlCancion: string,
): Promise<RespuestaDescarga> {
  const pestana = await asegurarPestanaSoundCloud({
    activar: false,
    crearSiNoExiste: false,
  });

  if (!pestana?.id) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: 'Abre SoundCloud para poder descargar la canción.',
    };
  }

  // Estrategia 1: desde la página de SoundCloud.
  try {
    const resultado = await descargarDesdePaginaSoundCloud(pestana.id, urlCancion);
    if (resultado.exito) return resultado;
    log.warn('desde-pagina-no-completada', resultado.mensaje);
  } catch (err) {
    log.warn('desde-pagina-fallo', err);
  }

  // Estrategia 2: btch-downloader.
  const respuestaBtch = await descargarViaBtch(urlCancion);
  if (respuestaBtch?.exito) return respuestaBtch;

  // Estrategia 3: API nativa SoundCloud.
  try {
    const respuestaApi = await descargarViaSoundCloudApi(pestana.id, urlCancion);
    if (respuestaApi.exito) return respuestaApi;
    log.warn('via-api-no-completada', respuestaApi.mensaje);
  } catch (err) {
    log.error('via-api-fallo', err);
  }

  // Estrategia 4: servicio web (abre pestaña, el usuario descarga manualmente).
  log.info('intentando-via-web-service', urlCancion);
  return descargarViaServicioWeb(urlCancion);
}
