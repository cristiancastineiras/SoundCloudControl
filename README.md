# SoundCloud Control

<p align="start">
  <a href="">
    <img src="./assets/get-extension/get-in-chrome.svg" height="80">
  </a>
  
  <a href="https://addons.mozilla.org/es-ES/firefox/addon/soundcloud-control/">
    <img src="./assets/get-extension/get-in-firefox.svg" height="80">
  </a>
</p>


### Controla SoundCloud sin cambiar de pestaña

![Typing SVG](https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=20&pause=1200&color=FF5500&center=true&vCenter=true&width=900&lines=Play%2C+pausa+y+skip+al+instante;Modo+compacto+para+no+comerte+media+pantalla;Equalizador%2C+descarga+MP3+y+atajos+de+teclado)

![Release](https://img.shields.io/github/v/release/cristiancastineiras/SoundCloudControl?label=release&color=ff5500)
![Release workflow](https://img.shields.io/github/actions/workflow/status/cristiancastineiras/SoundCloudControl/release.yml?label=release%20workflow)
![Last commit](https://img.shields.io/github/last-commit/cristiancastineiras/SoundCloudControl)
![GitHub stars](https://img.shields.io/github/stars/cristiancastineiras/SoundCloudControl?style=social)

![WXT](https://img.shields.io/badge/WXT-0.20+-111111?logo=webcomponents.org&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)

## Qué es

SoundCloud Control es una extensión para navegador que te deja manejar SoundCloud desde un popup rápido:

- Controles principales: anterior, play/pause, siguiente.
- Controles avanzados: shuffle, repetir lista, repetir pista, me gusta, mute.
- Equalizador integrado.
- Modo compacto para una UI más horizontal.
- Botón de descarga MP3 configurable.
- Aviso de actualización automática cuando hay nueva versión en GitHub Releases.

Está pensada para ir rápido: abres el popup, tocas un botón y listo.

## Capturas

| Firefox | Chrome |
|:--:|:--:|
| ![Popup en Firefox](./assets/firefox.png) | ![Popup en Chrome](./assets/chrome.png) |

| Compact mode | Tema personalizado + Equalizador |
|:--:|:--:|
| ![Modo compacto](./assets/firefox-compact-mode.png) | ![Colores personalizados](./assets/firefox-custom-colors.png) |

| Equalizador |
|:--:|
| ![Equalizador](./assets/ecualizador.png) |

## Arquitectura

Diagrama generado desde GitDiagram:

- https://gitdiagram.com/cristiancastineiras/SoundCloudControl

![Diagrama de arquitectura](./assets/diagram.png)

## Stack

- WXT
- React + TypeScript
- Tailwind CSS v4
- Phosphor Icons

## Estructura rápida

- entrypoints/background.ts: coordinación de pestañas, comandos y mensajería.
- entrypoints/content.ts: control real del reproductor de SoundCloud en página.
- entrypoints/popup/App.tsx: lógica principal del popup.
- entrypoints/options/App.tsx: página de ajustes dedicada.
- entrypoints/popup/componentes: UI reutilizable.
- lib/contratos.ts: tipos y contratos compartidos.
- wxt.config.ts: manifest, permisos y build.

## Requisitos

- Node.js 20+ (recomendado)
- pnpm

## Instalación

```bash
pnpm install
```

## Comandos útiles

```bash
# Desarrollo
pnpm dev

# Desarrollo Firefox
pnpm dev:firefox

# Type-check
pnpm compile

# Build
pnpm build
pnpm build:firefox

# Zips para releases
pnpm zip
pnpm zip:firefox
pnpm zip:all
```

## Uso en 20 segundos

1. Abre SoundCloud en al menos una pestaña.
2. Pulsa el icono de la extensión.
3. Controla música sin cambiar de pestaña.

Si no hay pestaña compatible, el popup te muestra el estado y la opción de abrir SoundCloud.

## Atajos de teclado

Definidos en wxt.config.ts:

- Ctrl+Shift+5: pista anterior
- Ctrl+Shift+6: play/pause
- Ctrl+Shift+7: pista siguiente

Puedes cambiarlos desde la gestión de atajos del navegador.

## Permisos

- tabs: localizar y activar pestañas de SoundCloud.
- host_permissions en soundcloud.com y subdominios.
- host_permissions en api.github.com para comprobar nuevas releases.

## Release flow

- El workflow de release se dispara al hacer push de un tag tipo vX.Y.Z.
- Se ejecuta type-check, se generan zips para Chrome/Firefox y se publica release automática.

## Estado

Proyecto activo y orientado a velocidad de uso, con una UI compacta y configurable para el día a día.
