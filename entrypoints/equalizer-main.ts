import { instalarEqualizadorMainWorld } from '../lib/equalizerMainWorld';

export default defineContentScript({
  matches: ['*://soundcloud.com/*', '*://*.soundcloud.com/*'],
  runAt: 'document_end',
  world: 'MAIN',
  main() {
    instalarEqualizadorMainWorld();
  },
});