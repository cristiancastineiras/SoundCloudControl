import type { RespuestaDescarga } from '@/services/mensajeria';

/** Lanza la descarga del MP3 vía `browser.downloads`. */
export async function iniciarDescargaBrowser(
  urlDescarga: string,
  titulo?: string,
): Promise<RespuestaDescarga> {
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
