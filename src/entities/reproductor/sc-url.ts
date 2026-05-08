/** Helpers para URLs de SoundCloud. */

export function obtenerImagenGrande(url: string | null, tamano = 500) {
  if (!url) return null;
  return url
    .replace(/t\d+x\d+/gi, `t${tamano}x${tamano}`)
    .replace(/-large(?=\.(jpg|jpeg|png|webp))/gi, `-t${tamano}x${tamano}`)
    .replace(/(\d+x\d+)(\.(jpg|jpeg|png|webp))/gi, `${tamano}x${tamano}$2`);
}

export function esUrlSoundCloud(url: string | undefined | null) {
  if (!url) return false;
  return /^https?:\/\/([^/]+\.)?soundcloud\.com\//i.test(url);
}
