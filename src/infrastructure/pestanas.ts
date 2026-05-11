/**
 * Gestión de pestañas de SoundCloud.
 * Capa infrastructure: única autorizada a tocar `browser.tabs`.
 */
import { PATRONES_SOUNDCLOUD, URL_BASE_SOUNDCLOUD } from '@/entities/reproductor';

export type PestanaSoundCloud = Browser.tabs.Tab;

export interface OpcionesAsegurarPestana {
  activar: boolean;
  crearSiNoExiste: boolean;
}

export async function asegurarPestanaSoundCloud(
  opciones: OpcionesAsegurarPestana,
): Promise<PestanaSoundCloud | null> {
  const pestanas = await browser.tabs.query({
    url: [...PATRONES_SOUNDCLOUD],
    discarded: false,
  });

  const objetivo = seleccionarPestanaObjetivo(pestanas);

  if (!objetivo) {
    if (!opciones.crearSiNoExiste) return null;
    const creada = await browser.tabs.create({
      url: URL_BASE_SOUNDCLOUD,
      active: opciones.activar,
    });
    return creada ?? null;
  }

  if (opciones.activar && objetivo.id) {
    const actualizada = await browser.tabs.update(objetivo.id, { active: true });
    return actualizada ?? null;
  }

  return objetivo;
}

export async function listarPestanasSoundCloud() {
  return browser.tabs.query({
    url: [...PATRONES_SOUNDCLOUD],
    discarded: false,
  });
}

function seleccionarPestanaObjetivo(tabs: PestanaSoundCloud[]) {
  return [...tabs].sort((izq, der) => {
    const prioridadIzq = calcularPrioridadPestana(izq);
    const prioridadDer = calcularPrioridadPestana(der);

    for (let indice = 0; indice < prioridadIzq.length; indice += 1) {
      if (prioridadIzq[indice] === prioridadDer[indice]) {
        continue;
      }

      return prioridadDer[indice] - prioridadIzq[indice];
    }

    return 0;
  })[0] ?? null;
}

function calcularPrioridadPestana(tab: PestanaSoundCloud) {
  return [
    tab.audible ? 1 : 0,
    tab.status === 'complete' ? 1 : 0,
    tab.active ? 1 : 0,
    tab.lastAccessed ?? 0,
  ];
}
