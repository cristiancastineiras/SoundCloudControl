import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'SoundCloud Control',
    description: 'Controla la reproducción de SoundCloud sin cambiar de pestaña.',
    permissions: ['tabs'],
    host_permissions: ['*://soundcloud.com/*', '*://*.soundcloud.com/*'],
    icons: {
      '16': 'icon/16.ico',
      '32': 'icon/32.ico',
      '48': 'icon/48.ico',
      '96': 'icon/96.ico',
      '128': 'icon/128.ico',
    },
    action: {
      default_title: 'SoundCloud Control',
      default_icon: 'icon.svg',
    },
    commands: {
      'toggle-playback': {
        suggested_key: {
          default: 'Ctrl+Shift+6',
        },
        description: 'Alternar reproducción en SoundCloud',
      },
      'previous-song': {
        suggested_key: {
          default: 'Ctrl+Shift+5',
        },
        description: 'Ir a la pista anterior en SoundCloud',
      },
      'next-song': {
        suggested_key: {
          default: 'Ctrl+Shift+7',
        },
        description: 'Ir a la pista siguiente en SoundCloud',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: '{ecd8bf54-1dea-4415-9b5e-c9452d1255fe}',
        strict_min_version: '109.0',
      },
    },
  },
});
