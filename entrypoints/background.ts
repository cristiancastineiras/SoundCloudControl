import {
  ACCIONES_POR_COMANDO,
  crearRespuestaPopup,
  PATRONES_SOUNDCLOUD,
  URL_BASE_SOUNDCLOUD,
  esComandoRapido,
  esSolicitudPopup,
  type AccionReproductor,
  type EstadoCancion,
  type RespuestaDescarga,
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
): Promise<RespuestaPopup | RespuestaDescarga> {
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
    case 'descargar-cancion':
      return gestionarDescargaCancion(solicitud.urlCancion);
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

const BTCH_API = 'https://backend1.tioo.eu.org';
const SC_API = 'https://api-v2.soundcloud.com';

interface SoundCloudApiResult {
  status?: boolean;
  title?: string;
  audio?: string;
  downloadMp3?: string;
  thumbnail?: string;
  downloadArtwork?: string;
  [key: string]: unknown;
}

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

async function gestionarDescargaCancion(urlCancion: string): Promise<RespuestaDescarga> {
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

  try {
    const resultadoPagina = await descargarDesdePaginaSoundCloud(
      pestana.id,
      urlCancion,
    );

    if (resultadoPagina.exito) {
      return resultadoPagina;
    }

    console.warn('[BG] descarga desde la página no completada:', resultadoPagina.mensaje);
  } catch (err) {
    console.warn('[BG] descarga desde la página falló:', err);
  }

  // Intento 1: btch-downloader /soundcloud
  try {
    const respHttp = await fetch(`${BTCH_API}/soundcloud?url=${encodeURIComponent(urlCancion)}`);
    if (respHttp.ok) {
      const datos = (await respHttp.json()) as SoundCloudApiResult;
      console.log('[BG] respuesta /soundcloud:', JSON.stringify(datos));
      const urlDescarga = datos.downloadMp3 || datos.audio;
      if (urlDescarga) return await iniciarDescargaBrowser(urlDescarga, datos.title);
    }
  } catch (err) {
    console.warn('[BG] btch-downloader falló:', err);
  }

  // Intento 2: API nativa de SoundCloud con client_id extraído de la pestaña
  try {
    const pestana = await asegurarPestanaSoundCloud({ activar: false, crearSiNoExiste: false });
    if (pestana?.id) {
      return await descargarViaSoundCloudApi(pestana.id, urlCancion);
    }
  } catch (err) {
    console.error('[BG] SC API falló:', err);
  }

  return { tipo: 'descarga', exito: false, mensaje: 'No se encontró un enlace de descarga MP3 para esta canción.' };
}

async function descargarDesdePaginaSoundCloud(
  tabId: number,
  urlCancion: string,
): Promise<RespuestaDescarga> {
  const resultados = await browser.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [urlCancion],
    func: async (objetivoUrl: string) => {
      const normalizarUrl = (valor: string | null | undefined) => {
        if (!valor) {
          return '';
        }

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
          const coincidencia = entrada.name.match(/[?&]client_id=([^&]+)/);
          if (coincidencia?.[1]) {
            return coincidencia[1];
          }
        }

        return null;
      };

      const ventana = window as Window & {
        __sc_hydration?: Array<{ hydratable?: string; data?: any }>;
      };

      const hidratacion = ventana.__sc_hydration ?? [];
      const urlObjetivoNormalizada = normalizarUrl(objetivoUrl);
      const pista =
        hidratacion.find((item) => (
          item?.hydratable === 'sound' &&
          normalizarUrl(item?.data?.permalink_url) === urlObjetivoNormalizada
        ))?.data ?? null;

      if (!pista) {
        return {
          tipo: 'descarga' as const,
          exito: false,
          mensaje: 'No se pudo localizar la pista activa en la página de SoundCloud.',
        };
      }

      const transcodings = Array.isArray(pista.media?.transcodings)
        ? pista.media.transcodings
        : [];
      const transcodingMp3Hls = transcodings.find((item: any) => (
        item?.format?.protocol === 'hls' &&
        typeof item?.format?.mime_type === 'string' &&
        item.format.mime_type.includes('audio/mpeg')
      ));

      const leerPlaylist = async (playlistUrl: string): Promise<string[]> => {
        const respuesta = await fetch(playlistUrl, {
          credentials: 'omit',
        });

        if (!respuesta.ok) {
          throw new Error(`No se pudo leer el manifiesto HLS (HTTP ${respuesta.status}).`);
        }

        const contenido = await respuesta.text();
        const lineas = contenido
          .split(/\r?\n/)
          .map((linea) => linea.trim())
          .filter(Boolean);

        if (!lineas.some((linea) => linea.startsWith('#EXTM3U'))) {
          throw new Error('La respuesta HLS no contiene un manifiesto válido.');
        }

        const rutasMedios = lineas.filter((linea) => !linea.startsWith('#'));

        if (rutasMedios.length === 1 && /\.m3u8(?:\?|$)/i.test(rutasMedios[0])) {
          return leerPlaylist(new URL(rutasMedios[0], playlistUrl).toString());
        }

        return rutasMedios.map((linea) => new URL(linea, playlistUrl).toString());
      };

      const descargarSegmentos = async (segmentos: string[]) => {
        const partes: Uint8Array[] = [];
        let tamanoTotal = 0;

        for (const segmento of segmentos) {
          const respuesta = await fetch(segmento, {
            credentials: 'omit',
          });

          if (!respuesta.ok) {
            throw new Error(`No se pudo descargar un segmento MP3 (HTTP ${respuesta.status}).`);
          }

          const datos = new Uint8Array(await respuesta.arrayBuffer());
          tamanoTotal += datos.byteLength;
          partes.push(datos);
        }

        const archivo = new Uint8Array(tamanoTotal);
        let desplazamiento = 0;

        for (const parte of partes) {
          archivo.set(parte, desplazamiento);
          desplazamiento += parte.byteLength;
        }

        return new Blob([archivo], { type: 'audio/mpeg' });
      };

      try {
        let playlistUrl: string | null = null;
        const clientId = obtenerClientId();

        if (transcodingMp3Hls && clientId) {
          const parametros = new URLSearchParams({ client_id: clientId });

          if (typeof pista.track_authorization === 'string' && pista.track_authorization) {
            parametros.set('track_authorization', pista.track_authorization);
          }

          const respuestaStream = await fetch(
            `${transcodingMp3Hls.url}?${parametros.toString()}`,
            { credentials: 'include' },
          );

          if (respuestaStream.ok) {
            const payload = await respuestaStream.json().catch(() => null) as { url?: string } | null;
            if (payload?.url) {
              playlistUrl = payload.url;
            }
          }
        }

        if (!playlistUrl) {
          const entradas = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          const playlistsCargadas = entradas
            .map((entrada) => entrada.name)
            .filter((url) => /cf-hls-media\.sndcdn\.com\/playlist\/.*\.mp3\/playlist\.m3u8/i.test(url));

          playlistUrl = playlistsCargadas.at(-1) ?? null;
        }

        if (!playlistUrl) {
          return {
            tipo: 'descarga' as const,
            exito: false,
            mensaje: 'SoundCloud no expuso el manifiesto MP3 de la pista actual.',
          };
        }

        const segmentos = await leerPlaylist(playlistUrl);
        const segmentosMp3 = segmentos.filter((url) => /\.mp3(?:\?|$)/i.test(url));

        if (segmentosMp3.length === 0) {
          return {
            tipo: 'descarga' as const,
            exito: false,
            mensaje: 'El manifiesto HLS no contiene segmentos MP3 descargables.',
          };
        }

        const blob = await descargarSegmentos(segmentosMp3);
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

        return {
          tipo: 'descarga' as const,
          exito: true,
          mensaje: 'Descarga iniciada.',
        };
      } catch (error) {
        return {
          tipo: 'descarga' as const,
          exito: false,
          mensaje: error instanceof Error
            ? error.message
            : 'No se pudo montar el MP3 desde el stream HLS de SoundCloud.',
        };
      }
    },
  });

  return resultados[0]?.result ?? {
    tipo: 'descarga',
    exito: false,
    mensaje: 'No se pudo ejecutar la descarga dentro de la pestaña de SoundCloud.',
  };
}

async function extraerClientIdSoundCloud(tabId: number): Promise<string | null> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const entries = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]);
        for (const entry of entries) {
          const match = entry.name.match(/[?&]client_id=([a-zA-Z0-9]{8,})/);
          if (match) return match[1];
        }
        return null;
      },
    });
    return (results[0]?.result as string | null) ?? null;
  } catch (err) {
    console.warn('[BG] no se pudo extraer client_id:', err);
    return null;
  }
}

async function descargarViaSoundCloudApi(tabId: number, urlCancion: string): Promise<RespuestaDescarga> {
  const clientId = await extraerClientIdSoundCloud(tabId);
  if (!clientId) {
    return { tipo: 'descarga', exito: false, mensaje: 'No se pudo obtener las credenciales de SoundCloud.' };
  }

  console.log('[BG] client_id extraído:', clientId.slice(0, 8) + '...');

  const resolveResp = await fetch(
    `${SC_API}/resolve?url=${encodeURIComponent(urlCancion)}&client_id=${clientId}`,
  );

  if (!resolveResp.ok) {
    return { tipo: 'descarga', exito: false, mensaje: `Error al resolver la pista (HTTP ${resolveResp.status}).` };
  }

  const track = (await resolveResp.json()) as ScTrack;
  console.log('[BG] track resuelto, id:', track.id, '| transcodings:', track.media?.transcodings?.length ?? 0);

  const transcodings = track.media?.transcodings ?? [];
  const progressive = transcodings.find(
    (t) => t.format?.protocol === 'progressive' && t.format?.mime_type === 'audio/mpeg',
  );

  if (!progressive) {
    return { tipo: 'descarga', exito: false, mensaje: 'Esta pista no tiene formato MP3 de descarga disponible.' };
  }

  const streamResp = await fetch(`${progressive.url}?client_id=${clientId}`);
  if (!streamResp.ok) {
    return { tipo: 'descarga', exito: false, mensaje: `Error al obtener el stream (HTTP ${streamResp.status}).` };
  }

  const { url: streamUrl } = (await streamResp.json()) as { url: string };
  console.log('[BG] stream URL obtenida correctamente');

  return await iniciarDescargaBrowser(streamUrl, track.title);
}

async function iniciarDescargaBrowser(urlDescarga: string, titulo?: string): Promise<RespuestaDescarga> {
  const nombreArchivo = titulo
    ? `${titulo.replace(/[/\\:*?"<>|]/g, '_')}.mp3`
    : 'soundcloud.mp3';

  await browser.downloads.download({
    url: urlDescarga,
    filename: nombreArchivo,
    saveAs: false,
  });

  return { tipo: 'descarga', exito: true, mensaje: 'Descarga iniciada.' };
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
