/**
 * Estrategia 4 — Descargador web (soundclouddownloader.io).
 *
 * Último recurso cuando las tres estrategias programáticas fallan.
 * Abre la pista en un servicio de descarga web en una pestaña en segundo
 * plano. El usuario debe completar la descarga manualmente desde esa pestaña.
 *
 * Fuente de la idea: IDEAS/downloader/content.js
 * (apertura de soundclouddownloader.io/en3#url=ENCODED_URL)
 */
import type { RespuestaDescarga } from '@/services/mensajeria';

const URL_DESCARGADOR_WEB = 'https://soundclouddownloader.io/en3';

function esUrlPistaValida(url: string): boolean {
  // Solo pistas y playlists (/sets/), no perfiles ni páginas de navegación.
  const RUTAS_INVALIDAS = [
    '/discover', '/stream', '/you', '/messages', '/notifications',
    '/feed', '/upload', '/search', '/settings', '/charts',
  ];
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('soundcloud.com')) return false;
    const partes = parsed.pathname.replace(/^\//, '').split('/').filter(Boolean);
    if (partes.length < 2) return false;
    return !RUTAS_INVALIDAS.some((ruta) => parsed.pathname.startsWith(ruta));
  } catch {
    return false;
  }
}

export async function descargarViaServicioWeb(
  urlCancion: string,
): Promise<RespuestaDescarga> {
  if (!esUrlPistaValida(urlCancion)) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: 'La URL no corresponde a una pista o playlist de SoundCloud.',
    };
  }
  try {
    const url = `${URL_DESCARGADOR_WEB}#url=${encodeURIComponent(urlCancion)}`;
    await browser.tabs.create({ url, active: false });
    return {
      tipo: 'descarga',
      exito: true,
      mensaje: 'Descarga abierta en una nueva pestaña.',
    };
  } catch {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: 'No se pudo abrir el servicio de descarga web.',
    };
  }
}
