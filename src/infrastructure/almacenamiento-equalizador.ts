/**
 * Persistencia y propagación de los ajustes del equalizador.
 * Acceso único a la clave de storage del EQ.
 */
import {
  type AjustesEqualizador,
  normalizarAjustesEqualizador,
  resumirAjustesEqualizador,
} from '@/entities/equalizador';
import type { SolicitudContenido } from '@/services/mensajeria';
import { crearLogger } from '@/shared';
import { listarPestanasSoundCloud } from './pestanas';

const CLAVE_STORAGE_EQUALIZADOR = 'soundcloud-control.equalizer';
const log = crearLogger('infra.eq-storage');

export async function leerAjustesEqualizador(): Promise<AjustesEqualizador> {
  const almacenado = await browser.storage.local.get(CLAVE_STORAGE_EQUALIZADOR);
  const ajustes = normalizarAjustesEqualizador(almacenado[CLAVE_STORAGE_EQUALIZADOR]);
  log.info('ajustes-cargados', resumirAjustesEqualizador(ajustes));
  return ajustes;
}

export async function guardarAjustesEqualizador(
  ajustes: AjustesEqualizador,
): Promise<void> {
  await browser.storage.local.set({ [CLAVE_STORAGE_EQUALIZADOR]: ajustes });
  log.info('ajustes-guardados', resumirAjustesEqualizador(ajustes));
}

export async function sincronizarEqualizadorEnPestanas(ajustes: AjustesEqualizador) {
  const tabs = await listarPestanasSoundCloud();
  log.info('sincronizar-tabs', {
    total: tabs.length,
    ajustes: resumirAjustesEqualizador(ajustes),
  });

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return;
      try {
        await browser.tabs.sendMessage(tab.id, {
          canal: 'soundcloud-control',
          tipo: 'aplicar-equalizador',
          ajustes,
        } satisfies SolicitudContenido);
      } catch (err) {
        log.warn('sincronizacion-fallo', { tabId: tab.id, error: err });
      }
    }),
  );
}
