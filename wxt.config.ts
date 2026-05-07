import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: (env) => ({
    plugins: [
      preact({
        prefreshEnabled: env.mode === 'development',
      }),
      tailwindcss(),
    ],
    build: {
      target: 'esnext',
      modulePreload: { polyfill: false },
      minify: 'terser',
      terserOptions: {
        compress: {
          passes: 3,
          drop_console: true,
          drop_debugger: true,
          pure_getters: true,
          unsafe_arrows: true,
        },
        mangle: true,
        format: {
          comments: false,
        },
      },
      rolldownOptions: {
        treeshake: {
          annotations: true,
        },
      },
    },
  }),
  zip: {
    exclude: [
      '**/*.ico',   // no referenciados en manifest, solo para web favicon
      '**/*.woff',  // navegadores objetivo usan woff2; woff nunca se carga
    ],
  },
  manifest: {
    name: 'SoundCloud Control',
    description: 'Controla la reproducción de SoundCloud sin cambiar de pestaña.',
    permissions: ['tabs', 'scripting', 'downloads', 'storage'],
    host_permissions: [
      '*://soundcloud.com/*',
      '*://*.soundcloud.com/*',
      '*://backend1.tioo.eu.org/*',
      '*://api-v2.soundcloud.com/*',
      '*://api.github.com/*',
    ],
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '96': 'icon/96.png',
      '128': 'icon/128.png',
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
        id: '{65009ef0-e104-4198-b842-f828ad527a1a}',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
