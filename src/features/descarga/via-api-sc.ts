/**
 * Estrategia 3 — API nativa de SoundCloud (api-v2) usando el `client_id`
 * extraído de la pestaña activa.
 */
import type { RespuestaDescarga } from '@/services/mensajeria';
import { crearLogger } from '@/shared';
import { iniciarDescargaBrowser } from './descarga-browser';

const SC_API = 'https://api-v2.soundcloud.com';
const log = crearLogger('descarga.via-api');

interface ScTranscoding {
  url: string;
  format: { protocol: string; mime_type: string };
  quality?: string;
}

interface ScTrack {
  id?: number;
  title?: string;
  media?: { transcodings: ScTranscoding[] };
}

export async function extraerClientIdSoundCloud(tabId: number): Promise<string | null> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        for (const entry of entries) {
          const m = entry.name.match(/[?&]client_id=([a-zA-Z0-9]{8,})/);
          if (m) return m[1];
        }
        return null;
      },
    });
    return (results[0]?.result as string | null) ?? null;
  } catch (err) {
    log.warn('extraer-client-id-fallo', err);
    return null;
  }
}

export async function descargarViaSoundCloudApi(
  tabId: number,
  urlCancion: string,
): Promise<RespuestaDescarga> {
  const clientId = await extraerClientIdSoundCloud(tabId);
  if (!clientId) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: 'No se pudo obtener las credenciales de SoundCloud.',
    };
  }

  const resolveResp = await fetch(
    `${SC_API}/resolve?url=${encodeURIComponent(urlCancion)}&client_id=${clientId}`,
  );

  if (!resolveResp.ok) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: `Error al resolver la pista (HTTP ${resolveResp.status}).`,
    };
  }

  const track = (await resolveResp.json()) as ScTrack;
  const transcodings = track.media?.transcodings ?? [];
  const progressive = transcodings.find(
    (t) => t.format?.protocol === 'progressive' && t.format?.mime_type === 'audio/mpeg',
  );

  if (!progressive) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: 'Esta pista no tiene formato MP3 de descarga disponible.',
    };
  }

  const streamResp = await fetch(`${progressive.url}?client_id=${clientId}`);
  if (!streamResp.ok) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: `Error al obtener el stream (HTTP ${streamResp.status}).`,
    };
  }

  const { url: streamUrl } = (await streamResp.json()) as { url: string };
  return await iniciarDescargaBrowser(streamUrl, track.title);
}
