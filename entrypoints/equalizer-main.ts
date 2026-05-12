import { instalarEqualizadorMainWorld } from '@/services/puenteEqualizador';
import { instalarVelocidadMainWorld } from '@/services/velocidadMainWorld';
import { CAPACIDADES } from '@/shared';

export default defineContentScript({
  matches: ['*://soundcloud.com/*', '*://*.soundcloud.com/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    // El override de volumen siempre se instala (necesario para bloquear los
    // resets internos de SC en todos los navegadores, especialmente en Chrome
    // con pestañas en segundo plano).
    // El override de velocidad y el equalizador solo se instalan en Firefox.
    instalarVelocidadMainWorld({ velocidad: CAPACIDADES.controlVelocidad });

    if (CAPACIDADES.equalizador) {
      instalarEqualizadorMainWorld();
    }
  },
});