# SoundCloud Control
[![icono](./public/icon/128.png)](./public/icon/128.png)


Extensión de navegador creada con WXT para controlar SoundCloud sin cambiar de pestaña.

<div align="center">

| Firefox | Chrome |
|:-------:|:------:|
| [![Firefox](./assets/firefox.png)](./assets/firefox.png) | [![Chrome](./assets/chrome.png)](./assets/chrome.png) |

</div>


## Resumen

SoundCloud Control detecta una pestaña activa de SoundCloud y muestra un popup con controles del reproductor.

Incluye:

- Controles principales: anterior, reproducir/pausar, siguiente.
- Controles avanzados: shuffle, repetición de lista, repetición de pista, me gusta y silencio.
- Indicadores visuales de estado para saber qué modos están activos.
- Acciones rápidas por teclado (comandos del navegador).

## Tecnologías

- WXT
- React + TypeScript
- Tailwind CSS v4
- Phosphor Icons (React)

## Estructura del proyecto

- [entrypoints/background.ts](entrypoints/background.ts): coordinación de pestañas, comandos y mensajería.
- [entrypoints/content.ts](entrypoints/content.ts): interacción real con el reproductor y el DOM de SoundCloud.
- [entrypoints/popup/App.tsx](entrypoints/popup/App.tsx): orquestación del estado del popup.
- [entrypoints/popup/componentes](entrypoints/popup/componentes): componentes de interfaz.
- [lib/contratos.ts](lib/contratos.ts): tipos compartidos y contratos de mensajes.
- [wxt.config.ts](wxt.config.ts): configuración de build/manifest para WXT.

## Requisitos

- Node.js 20 o superior recomendado.
- pnpm instalado globalmente.

## Instalación

```bash
pnpm install
```

## Scripts disponibles

```bash
# Desarrollo (navegador por defecto)
pnpm dev

# Desarrollo en Firefox
pnpm dev:firefox

# Comprobar tipos
pnpm compile

# Build producción (navegador por defecto)
pnpm build

# Build producción para Firefox
pnpm build:firefox

# Generar zip (navegador por defecto)
pnpm zip

# Generar zip para Firefox
pnpm zip:firefox
```

## Uso

1. Abre SoundCloud en al menos una pestaña.
2. Pulsa el icono de la extensión.
3. Controla la reproducción desde el popup.

Si no hay pestaña compatible, el popup mostrará el estado correspondiente y la opción de abrir SoundCloud.

## Atajos de teclado (comandos)

Definidos en [wxt.config.ts](wxt.config.ts):

- `Ctrl+Shift+5`: pista anterior
- `Ctrl+Shift+6`: reproducir/pausar
- `Ctrl+Shift+7`: pista siguiente

Puedes cambiarlos desde la gestión de atajos del navegador.

## Permisos

La extensión usa:

- `tabs`: localizar y activar pestañas de SoundCloud.
- `host_permissions` para `soundcloud.com` y subdominios: leer/controlar el reproductor en esas páginas.

## Solución de problemas

- Si falla el popup o no encuentra módulos en build, ejecuta primero `pnpm compile` para detectar inconsistencias de tipos/imports.
- Si WXT no resuelve un archivo, verifica que exista físicamente en disco (no solo abierto en el editor).

## Estado actual

Proyecto funcional y empaquetable con `pnpm zip:firefox`, orientado a control rápido del reproductor con una UI compacta y mantenible.
