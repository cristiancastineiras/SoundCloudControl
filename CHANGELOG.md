# Changelog

Todos los cambios importantes del proyecto se documentan aquí.
Plantilla: https://keepachangelog.com/en/1.0.0/

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