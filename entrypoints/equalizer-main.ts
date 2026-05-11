import { instalarEqualizadorMainWorld } from '@/services/puenteEqualizador';
import { instalarVelocidadMainWorld } from '@/services/velocidadMainWorld';

export default defineContentScript({
  matches: ['*://soundcloud.com/*', '*://*.soundcloud.com/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    instalarEqualizadorMainWorld();
    instalarVelocidadMainWorld();
  },
});