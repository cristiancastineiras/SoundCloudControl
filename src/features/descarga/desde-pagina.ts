/**
 * Estrategia 1 — descarga directa desde la pestaña de SoundCloud.
 *
 * Inyecta una función en el MAIN world de la pestaña, lee el manifiesto HLS
 * de la pista activa, baja todos los segmentos y los une en un blob MP3.
 * Es la estrategia preferida porque reutiliza las credenciales del usuario.
 */
import type { RespuestaDescarga } from '@/services/mensajeria';

export async function descargarDesdePaginaSoundCloud(
  tabId: number,
  urlCancion: string,
): Promise<RespuestaDescarga> {
  const resultados = await browser.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [urlCancion],
    func: ejecutarDescargaEnPagina,
  });

  return (
    resultados[0]?.result ?? {
      tipo: 'descarga',
      exito: false,
      mensaje: 'No se pudo ejecutar la descarga dentro de la pestaña de SoundCloud.',
    }
  );
}

// Función inyectada en MAIN world. Debe ser autocontenida (no closures).
async function ejecutarDescargaEnPagina(objetivoUrl: string): Promise<RespuestaDescarga> {
  const normalizarUrl = (valor: string | null | undefined) => {
    if (!valor) return '';
    try {
      const url = new URL(valor);
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return valor;
    }
  };

  const limpiarNombreArchivo = (valor: string | null | undefined) => {
    const base = (valor || 'soundcloud').trim();
    return base.replace(/[/\\:*?"<>|]/g, '_');
  };

  const obtenerClientId = () => {
    const entradas = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    for (const entrada of entradas) {
      const m = entrada.name.match(/[?&]client_id=([^&]+)/);
      if (m?.[1]) return m[1];
    }
    return null;
  };

  const ventana = window as Window & {
    __sc_hydration?: Array<{ hydratable?: string; data?: any }>;
  };

  const hidratacion = ventana.__sc_hydration ?? [];
  const urlNorm = normalizarUrl(objetivoUrl);
  const pista =
    hidratacion.find(
      (item) =>
        item?.hydratable === 'sound' &&
        normalizarUrl(item?.data?.permalink_url) === urlNorm,
    )?.data ?? null;

  if (!pista) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje: 'No se pudo localizar la pista activa en la página de SoundCloud.',
    };
  }

  const transcodings = Array.isArray(pista.media?.transcodings) ? pista.media.transcodings : [];
  const transcodingMp3Hls = transcodings.find(
    (item: any) =>
      item?.format?.protocol === 'hls' &&
      typeof item?.format?.mime_type === 'string' &&
      item.format.mime_type.includes('audio/mpeg'),
  );

  const leerPlaylist = async (playlistUrl: string): Promise<string[]> => {
    const respuesta = await fetch(playlistUrl, { credentials: 'omit' });
    if (!respuesta.ok) {
      throw new Error(`No se pudo leer el manifiesto HLS (HTTP ${respuesta.status}).`);
    }
    const contenido = await respuesta.text();
    const lineas = contenido.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lineas.some((l) => l.startsWith('#EXTM3U'))) {
      throw new Error('La respuesta HLS no contiene un manifiesto válido.');
    }
    const rutas = lineas.filter((l) => !l.startsWith('#'));
    if (rutas.length === 1 && /\.m3u8(?:\?|$)/i.test(rutas[0])) {
      return leerPlaylist(new URL(rutas[0], playlistUrl).toString());
    }
    return rutas.map((l) => new URL(l, playlistUrl).toString());
  };

  const descargarSegmentos = async (segmentos: string[]) => {
    const partes: Uint8Array[] = [];
    let total = 0;
    for (const segmento of segmentos) {
      const r = await fetch(segmento, { credentials: 'omit' });
      if (!r.ok) {
        throw new Error(`No se pudo descargar un segmento MP3 (HTTP ${r.status}).`);
      }
      const datos = new Uint8Array(await r.arrayBuffer());
      total += datos.byteLength;
      partes.push(datos);
    }
    const archivo = new Uint8Array(total);
    let off = 0;
    for (const p of partes) {
      archivo.set(p, off);
      off += p.byteLength;
    }
    return new Blob([archivo], { type: 'audio/mpeg' });
  };

  try {
    let playlistUrl: string | null = null;
    const clientId = obtenerClientId();

    if (transcodingMp3Hls && clientId) {
      const params = new URLSearchParams({ client_id: clientId });
      if (typeof pista.track_authorization === 'string' && pista.track_authorization) {
        params.set('track_authorization', pista.track_authorization);
      }
      const r = await fetch(`${transcodingMp3Hls.url}?${params.toString()}`, {
        credentials: 'include',
      });
      if (r.ok) {
        const payload = (await r.json().catch(() => null)) as { url?: string } | null;
        if (payload?.url) playlistUrl = payload.url;
      }
    }

    if (!playlistUrl) {
      const entradas = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const cargadas = entradas
        .map((e) => e.name)
        .filter((url) =>
          /cf-hls-media\.sndcdn\.com\/playlist\/.*\.mp3\/playlist\.m3u8/i.test(url),
        );
      playlistUrl = cargadas.at(-1) ?? null;
    }

    if (!playlistUrl) {
      return {
        tipo: 'descarga',
        exito: false,
        mensaje: 'SoundCloud no expuso el manifiesto MP3 de la pista actual.',
      };
    }

    const segmentos = await leerPlaylist(playlistUrl);
    const mp3 = segmentos.filter((u) => /\.mp3(?:\?|$)/i.test(u));
    if (mp3.length === 0) {
      return {
        tipo: 'descarga',
        exito: false,
        mensaje: 'El manifiesto HLS no contiene segmentos MP3 descargables.',
      };
    }

    const blob = await descargarSegmentos(mp3);
    const enlace = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    enlace.href = objectUrl;
    enlace.download = `${limpiarNombreArchivo(pista.title)}.mp3`;
    enlace.style.display = 'none';
    enlace.rel = 'noopener';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

    return { tipo: 'descarga', exito: true, mensaje: 'Descarga iniciada.' };
  } catch (error) {
    return {
      tipo: 'descarga',
      exito: false,
      mensaje:
        error instanceof Error
          ? error.message
          : 'No se pudo montar el MP3 desde el stream HLS de SoundCloud.',
    };
  }
}
