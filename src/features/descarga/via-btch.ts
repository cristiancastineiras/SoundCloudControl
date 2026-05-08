/**
 * Estrategia 2 — btch-downloader (servicio externo).
 * Fallback para usuarios anónimos / sesiones restringidas.
 */
import type { RespuestaDescarga } from '@/services/mensajeria';
import { iniciarDescargaBrowser } from './descarga-browser';

const BTCH_API = 'https://backend1.tioo.eu.org';

interface RespuestaBtch {
  status?: boolean;
  title?: string;
  audio?: string;
  downloadMp3?: string;
}

export async function descargarViaBtch(
  urlCancion: string,
): Promise<RespuestaDescarga | null> {
  try {
    const resp = await fetch(`${BTCH_API}/soundcloud?url=${encodeURIComponent(urlCancion)}`);
    if (!resp.ok) return null;
    const datos = (await resp.json()) as RespuestaBtch;
    const urlDescarga = datos.downloadMp3 || datos.audio;
    if (!urlDescarga) return null;
    return await iniciarDescargaBrowser(urlDescarga, datos.title);
  } catch {
    return null;
  }
}
