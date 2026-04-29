export function obtenerImagenGrande(url: string | null, tamano = 500) {
  if (!url) {
    return null;
  }

  return url
    .replace(/t\d+x\d+/gi, `t${tamano}x${tamano}`)
    .replace(/-large(?=\.(jpg|jpeg|png|webp))/gi, `-t${tamano}x${tamano}`)
    .replace(/(\d+x\d+)(\.(jpg|jpeg|png|webp))/gi, `${tamano}x${tamano}$2`);
}