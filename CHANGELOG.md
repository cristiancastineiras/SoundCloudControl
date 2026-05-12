# Changelog

Todos los cambios importantes del proyecto se documentan aquí.
Plantilla: https://keepachangelog.com/en/1.0.0/

## [1.7.0] - 2026-05-12

### Added
- Sistema de feature flags en tiempo de compilación mediante `src/shared/capacidades.ts` que detecta el navegador (`import.meta.env.BROWSER`) y desactiva funcionalidades no soportadas (equalizador y control de velocidad en Chrome, disponibles en Firefox).
- Compilación optimizada: Vite tree-shaking elimina código muerto automáticamente (Chrome `equalizer-main.js`: 4.6 kB vs Firefox: 13.3 kB).

### Fixed
- Volumen en Chrome: corregidas fórmulas del slider de volumen (`handle.top`, `progress.height`, `data-level`) basadas en el cálculo exacto de SoundCloud; agregado setter override en MAIN world para bloquear reseteos de SoundCloud durante 6 segundos tras comando de la extensión.
- Control de velocidad en Chrome: agregado listener `ratechange` para re-aplicar velocidad inmediatamente si HLS.js u otro código resetea `playbackRate` fuera del setter.
- Pestañas en segundo plano en Chrome: background.ts ahora usa `scripting.executeScript({ world: 'MAIN' })` para aplicar volumen/velocidad directamente desde el service worker, evitando la suspension de content scripts aislados en background tabs.
- Coordenadas del ratón en sincronización de volumen: `sincronizarUiVolumen` ahora usa `sliderBackground.getBoundingClientRect()` (correcta) en lugar de `sliderWrapper` para calcular proporción desde evento del ratón.

### Changed
- Reestructuración de `src/services/velocidadMainWorld.ts`: override de volumen siempre activo (Chrome+Firefox), override de velocidad gateado mediante parámetro `{ velocidad?: boolean }`.
- Popup UI: equalizador y control de velocidad ahora se ocultan automáticamente en Chrome mediante condicionales `CAPACIDADES.*`.
- Ajustes: sección "Control velocidad" ahora se oculta en navegadores sin soporte.

## [1.6.1] - 2026-05-11

### Fixed
- Workflow de release: ahora resuelve los artefactos reales generados por WXT para Chrome y Firefox, evitando fallos por rutas o nombres de archivo incorrectos.
- Publicación en Firefox: el envío a AMO termina tras crear la submission y ya no espera a la aprobación manual para finalizar el job.
- Condicionales del workflow: la publicación en tiendas se activa mediante variables de entorno compatibles con GitHub Actions cuando existen los secretos necesarios.

## [1.6.0] - 2026-05-08

### Added
- Nueva arquitectura por capas bajo `src/` (`app`, `shared`, `entities`, `services`, `infrastructure`, `features`) con aliases `@/` para modularizar dominio, mensajería, persistencia e inyección.
- Nuevo control de velocidad en el popup con UI dedicada y sincronización con MAIN world para mantener `playbackRate` frente a reseteos de SoundCloud.
- Documento de arquitectura del proyecto en `ARCHITECTURE.md`.

### Changed
- Migración de utilidades y contratos legacy desde `lib/` y `entrypoints/popup/*` a módulos tipados en `src/`.
- Integración del bootstrap del popup y de la configuración de Vite/TS para resolver imports por capas.

### Fixed
- Sincronización de volumen/velocidad en el content script para evitar estados desalineados entre popup, control nativo de SoundCloud y elemento `<audio>`.
- Ajuste de velocidad robusto con ciclo rápido mute/unmute previo para forzar la aplicación del cambio en cada uso.

## [1.5.1] - 2026-05-08

### Fixed
- Icono de acción del popup: se reemplaza `icon.svg` (no existente) por el mapa de PNGs por tamaño para evitar el error de decodificación de imagen en Chrome.

## [1.5.0] - 2026-05-08

### Added
- Control deslizante de volumen sincronizado con el estado real de SoundCloud, accesible desde el popup.
- Botón de seguir/dejar de seguir al artista actual con UI optimista e integración directa con el DOM de SoundCloud.
- Modo de apariencia claro/oscuro: selector en ajustes con persistencia; modo claro con sobreescrituras completas del sistema de diseño `sc-*`.
- Soporte para 20 idiomas en la interfaz: español, inglés, portugués, francés, alemán, italiano, neerlandés, ruso, árabe, turco, hindi, bengalí, urdu, chino simplificado, chino tradicional, japonés, coreano, indonesio, tailandés y vietnamita. El idioma se detecta automáticamente del navegador y se puede cambiar en ajustes.

### Fixed
- Resize dinámico del popup en Chrome: se usa `ResizeObserver` para detectar el ancho real y aplicar el modo compacto correctamente, evitando el ancho obsoleto que Chrome cachea entre vistas.

## [1.4.1] - 2026-05-08

### Fixed
- Modo compacto: los botones "Abrir SoundCloud" y "Reintentar" ahora se adaptan correctamente al espacio reducido cuando SoundCloud no está abierto. Antes se mostraban con el tamaño del modo normal (3 rem de alto, texto 0.9 rem); ahora usan el estilo `sc-btn-soft` con iconos e texto más pequeños, alineados al resto de controles compactos.

## [1.4.0] - 2026-05-07

### Added
- Comprobación de nueva versión desde GitHub Releases (`/releases/latest`) y aviso de actualización en el popup.
- Persistencia de preferencia para no volver a mostrar el aviso de la misma versión.
- Nuevo ajuste de `Modo compacto` en ajustes del popup (con persistencia en `localStorage`).
- Nueva página de opciones dedicada con su propio entrypoint (`entrypoints/options/index.html`, `App.tsx`, `main.tsx`).

### Changed
- Rediseño del modo compacto para layout horizontal con portada a la izquierda y controles en línea.
- Integración de botones compactos con estados activos y variantes visuales alineadas al sistema de diseño actual.
- El popup aplica clase `sc-compact` en `body` para evitar saltos visuales al abrir.
- Permisos de host actualizados para incluir API de GitHub (`*://api.github.com/*`).

### Fixed
- Mejoras de consistencia de estado entre controles compactos (shuffle, repeat, like, mute y descarga MP3).
- Ajustes de accesibilidad/ARIA para notificación de actualización y acciones en modo compacto.

## [1.3.1] - 2026-05-06

### Added
- Autoreleases en GitHub Actions para facilitar la distribución de nuevas versiones.


## [1.3.0] - 2026-05-04

### Added
- Añadido equalizador gráfico para personalizar el sonido directamente desde el popup.

---

## [1.2.0] - 2026-05-04

### Added
- Añadido soporte A11Y en el popup.

---

## [1.1.0] - 2026-05-01

### Added
- Añadido soporte para descargar audio directamente desde la extensión en formato MP3.

---