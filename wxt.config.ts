import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

const directorioRaiz = path.dirname(fileURLToPath(import.meta.url));
const rutaSrc = (segmento: string) => path.resolve(directorioRaiz, 'src', segmento);

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manifest: ({ manifestVersion }) => ({
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
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png',
      },
    },
    commands: {
      'toggle-playback': {
        suggested_key: { default: 'Ctrl+Shift+6' },
        description: 'Alternar reproducción en SoundCloud',
      },
      'previous-song': {
        suggested_key: { default: 'Ctrl+Shift+5' },
        description: 'Ir a la pista anterior en SoundCloud',
      },
      'next-song': {
        suggested_key: { default: 'Ctrl+Shift+7' },
        description: 'Ir a la pista siguiente en SoundCloud',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: '{65009ef0-e104-4198-b842-f828ad527a1a}',
        strict_min_version: '109.0',
        data_collection_permissions: { required: ['none'] },
      },
    },
    // Chrome MV3: declare the equalizer main-world script directly in the
    // manifest so Chrome injects it automatically — this bypasses any
    // service-worker timing issues with scripting.executeScript.
    ...(manifestVersion === 3
      ? {
          content_scripts: [
            {
              matches: ['*://soundcloud.com/*', '*://*.soundcloud.com/*'],
              run_at: 'document_start',
              js: ['equalizer-main.js'],
              world: 'MAIN',
            } as never,
          ],
        }
      : {}),
  } as never),
  vite: (env) => ({
    resolve: {
      alias: {
        '@/app': rutaSrc('app'),
        '@/shared': rutaSrc('shared'),
        '@/entities': rutaSrc('entities'),
        '@/services': rutaSrc('services'),
        '@/infrastructure': rutaSrc('infrastructure'),
        '@/features': rutaSrc('features'),
      },
    },
    plugins: [
      preact(),
      tailwindcss(),
    ],
    build: {
      target: 'esnext',
      modulePreload: { polyfill: true },
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
});

