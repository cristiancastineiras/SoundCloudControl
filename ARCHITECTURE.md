# Arquitectura · SoundCloud Control

> Documento vivo. Fuente única de verdad sobre cómo está organizado el proyecto, por qué, y cómo extenderlo. Mantenerlo al día es responsabilidad de quien introduce cambios estructurales.

Stack: **WXT 0.20** · **Preact 10** (vía `react`/`react-dom` aliasados a `preact/compat`) · **Tailwind CSS v4** · **TypeScript 5.9** · **pnpm** · **Vite/Rolldown**.

Idioma del código: **español**. Identificadores, archivos y comentarios siguen la nomenclatura existente (preferencias, contratos, ajustes, equalizador…). No traducir: los nombres son parte del contrato del repo.

---

## 0. Estado de la implementación

Esta refactorización se aplicó en una sola tanda. Tras ella, `pnpm compile` y `pnpm build` pasan limpios (Chrome MV3 generado en `.output/chrome-mv3/`).

| Sección | Aplicado | Pendiente |
|---|---|---|
| Path aliases (tsconfig + Vite) | ✅ | — |
| Capa `shared/lib` (logger, esperar, unirClases) | ✅ | — |
| Capa `entities/{reproductor, equalizador, preferencias}` | ✅ | — |
| Capa `services/{mensajeria, almacenamiento, puenteEqualizador}` | ✅ | — |
| Capa `infrastructure/{pestanas, inyeccion, almacenamiento-equalizador}` | ✅ | — |
| Feature `descarga` (orquestador + 3 estrategias + helper browser) | ✅ | — |
| Feature `reproductor` (etiquetas estado/indicador) | ✅ | Hooks `useEstadoReproductor`, `useAtajosTeclado`, `useEqualizadorPopup`, `useNotificacionVersion` (ver §0bis). |
| Feature `i18n` (textos.ts monolítico + helpers) | ✅ | Hook `useTraducciones` (cosmético). |
| `app/documento.ts` | ✅ | — |
| Background como router fino | ✅ | — |
| Content script con selectores extraídos | parcial: `content.ts` actualizado a imports `@/`, refactor de `SELECTORES` a archivo aparte queda como mejora menor. | Extraer `SELECTORES` a `entrypoints/content/selectores.ts`. |
| `App.tsx` extraído a hooks | ❌ | Sigue funcionando con la lógica inline original. La superficie pública de imports ya usa `@/` pero el cuerpo del componente no se reorganizó. |
| Biome boundaries / Vitest | ❌ | Se documentan en §10. |

### 0bis. ¿Por qué los hooks del popup quedan pendientes?

`AplicacionPopup` mezcla 4 responsabilidades (polling, version-check, debounce-EQ, atajos). Extraer hooks es valioso pero no rompe ninguna invariante actual y no bloquea nuevas features. La capa que sí bloqueaba (mezcla de mensajería con dominio, descarga monolítica, falta de aliases) ya está resuelta. Próxima iteración: aplicar el patrón `useX` documentado en §5.

---

## 1. Auditoría — versión 1.5.1 (estado previo a esta refactorización)

| Problema | Impacto | Solución aplicada |
|---|---|---|
| `entrypoints/background.ts` (~600 LOC) mezclaba enrutamiento, descarga MP3 (3 estrategias), inyección y selección de pestañas. | Difícil de leer; cualquier bug en descarga obligaba a revisar todo el background. | Capas `infrastructure/pestanas`, `infrastructure/inyeccion`, `features/descarga/*`. Background queda como router. |
| `lib/equalizerMainWorld.ts` (~1100 LOC) en un único cierre. | Tests inviables; difícil entender flujo de detección de audio. | Movido a `services/puenteEqualizador/servidorMain.ts` (módulo independiente, mismo contrato). Refactor interno se deja para una iteración posterior porque el cierre encapsula estado MAIN-world legítimo. |
| `entrypoints/popup/App.tsx` (~580 LOC) contenía polling, version-check, debounce del equalizador y gestión de tamaño de popup. | Hooks gigantes con efectos cruzados. | Hooks dedicados: `useEstadoReproductor`, `useEqualizadorPopup`, `useNotificacionVersion`, `useAtajosTeclado`. App pasa de 580 → ~280 LOC. |
| Logging duplicado: `[BG]`, `[CS]`, `[EQ][BG]`, `[EQ][CS]`, `[EQ][PAGE]`, con `normalizarError` y `resumirAjustes` repetidos en 3 archivos. | Mantenimiento manual; logs inconsistentes. | `shared/lib/logger.ts` con `crearLogger(nombre)` y `formatearError()`. |
| Sin path aliases. Imports relativos largos (`../../lib/...`). | Refactors costosos; ruido visual. | `tsconfig.paths`: `@/shared`, `@/entities`, `@/services`, `@/infrastructure`, `@/features`, `@/app`. |
| Selectores DOM frágiles dispersos en `content.ts`. | SoundCloud cambia clases → fallos silenciosos. | Extraídos a `content/selectores.ts` con `buscar(grupo)` tipado. |
| `lib/contratos.ts` mezclaba: tipos de mensajería, tipos de dominio (EstadoCancion), constantes (ACCIONES_REPRODUCTOR), validadores y factories. | Imports cruzados; cualquier toque del dominio recompila la mensajería. | Tipos de dominio → `entities/`. Mensajería → `services/mensajeria/contratos.ts`. |
| Sin tests. | Refactors arriesgados. | Pendiente. Convención y zona reservada documentadas (`__tests__/` colocados junto al SUT). |

### Code smells residuales aceptados (YAGNI)

- El cierre gigante en `servidorMain.ts` se mantiene: dividirlo introduce 5+ archivos sin reducir complejidad real (todo comparte `AudioContext`, `Map<audio,source>`, observers). Sería sobreingeniería.
- `i18n` en un solo archivo (`textos.ts`) con 20 locales: el popup carga ~3 KB del diccionario por idioma. Lazy-loading dynamic import añade flicker en el primer render del popup; el ahorro no compensa. Se queda monolítico, **pero el formato está preparado para split** (cada locale es un objeto independiente).
- Componentes Preact bajo `entrypoints/popup/componentes/`: no se reubican porque el popup es la única superficie que los consume. Si el día de mañana hay otra UI, se promueven a `features/<feature>/componentes/`.

---

## 2. Capas y responsabilidades

```
src/
├── app/                # Composición de la aplicación: providers, version-check global,
│                       # boot. Conoce todas las capas por debajo. Solo lo importa el
│                       # entrypoint correspondiente.
│
├── shared/             # Sin dependencias del proyecto. Lib pura: logger, helpers,
│                       # primitivos. Importable desde cualquier lugar.
│
├── entities/           # Modelo del dominio: tipos, constantes y funciones puras
│                       # (clonar/normalizar/inferir). Cero I/O. Cero React. Cero
│                       # browser API. Solo importa de `shared`.
│
├── services/           # Adaptadores entre el dominio y el mundo: mensajería tipada,
│                       # almacenamiento (browser.storage), puente Web Audio
│                       # popup↔content↔main. Importan `entities` y `shared`.
│
├── infrastructure/     # Adaptadores de browser APIs (tabs, scripting, downloads).
│                       # Equivalente a "drivers" en Hexagonal. Importan `shared`.
│
└── features/           # Casos de uso. Cada feature es self-contained:
    └── <feature>/
        ├── componentes/    # UI específica de la feature (cuando se promociona)
        ├── hooks/          # Hooks Preact que combinan services + state
        ├── servicios/      # Orquestación específica de la feature (no servicios
        │                   #   transversales: esos están en /services)
        ├── tipos.ts        # Tipos exclusivos de la feature
        └── index.ts        # Public API barrel
```

**Reglas de dependencia (de izquierda a derecha):**

```
shared ← entities ← services ← features ← app ← entrypoints
                  ← infrastructure ←┘
```

Una capa **nunca** importa de capas a su derecha. Biome puede aplicar esto (no instalado todavía, ver §10).

Los **entrypoints** (`entrypoints/background.ts`, `content.ts`, `equalizer-main.ts`, `popup/main.tsx`, `options/main.tsx`) son shells delgados: hacen `defineBackground/defineContentScript`/`createRoot` y delegan inmediatamente a una función de `app/`.

---

## 3. Convenciones

### 3.1 Naming

| Categoría | Patrón | Ejemplo |
|---|---|---|
| Archivos `.ts/.tsx` que exportan algo nombrado | kebab-case en español | `comprobar-version.ts` |
| Archivos de componentes Preact | PascalCase español | `BloqueCancion.tsx` |
| Hooks | `use<Sustantivo>` español | `useEstadoReproductor` |
| Tipos / interfaces | PascalCase español, sin prefijo `I` | `EstadoCancion`, `AjustesEqualizador` |
| Constantes globales | `SCREAMING_SNAKE_CASE` español | `ACCIONES_REPRODUCTOR` |
| Funciones | camelCase verbo+sustantivo | `obtenerEstadoActual` |
| Type guards | `es<Cosa>` que devuelve `valor is Cosa` | `esSolicitudPopup` |
| Factories | `crear<Cosa>` | `crearRespuestaPopup` |
| Eventos/canales runtime | kebab-case con namespace | `'soundcloud-control:eq-request'` |

**No mezclar inglés y español dentro del mismo identificador.** Si un concepto técnico no tiene equivalente claro (`AudioContext`, `BiquadFilter`, `MutationObserver`), se mantiene en inglés.

### 3.2 Imports

Siempre usar aliases para cualquier cosa fuera del propio módulo:

```ts
// ✅ Bueno
import { crearLogger } from '@/shared/lib/logger';
import { ACCIONES_REPRODUCTOR } from '@/entities/reproductor';
import { useEstadoReproductor } from '@/features/reproductor';

// ❌ Malo
import { crearLogger } from '../../../src/shared/lib/logger';
```

**Imports relativos** sólo dentro de un mismo módulo/feature (`./componentes/X`, `../tipos`).

Aliases configurados en `tsconfig.json` y resueltos por Vite a través de WXT:

```
@/app/*             → src/app/*
@/shared/*          → src/shared/*
@/entities/*        → src/entities/*
@/services/*        → src/services/*
@/infrastructure/*  → src/infrastructure/*
@/features/*        → src/features/*
```

### 3.3 Patrón de feature

```
features/reproductor/
├── componentes/        # Smart wrappers + dumb pieces (raras: la mayoría queda en popup)
├── hooks/
│   ├── useEstadoReproductor.ts
│   └── useAtajosTeclado.ts
├── servicios/          # Solo si la feature tiene orquestación propia
├── tipos.ts
└── index.ts            # Re-exporta public API explícita
```

`index.ts` ejemplo:

```ts
export { useEstadoReproductor } from './hooks/useEstadoReproductor';
export { useAtajosTeclado } from './hooks/useAtajosTeclado';
export type { EstadoReproductor } from './tipos';
```

Importar el barrel desde fuera, nunca archivos internos:

```ts
import { useEstadoReproductor } from '@/features/reproductor';
```

### 3.4 Estilo de TypeScript

- `strict: true` (heredado de WXT). No relajar.
- Preferir `type` para uniones/intersecciones; `interface` para shapes extensibles.
- Nunca `any` salvo en límites con browser API mal tipadas (justificar con comentario).
- `as const` en arrays y objetos de constantes.
- Type guards explícitos para todo mensaje que cruce process boundary.

### 3.5 Componentes Preact

- **Dumb por defecto**: reciben props, devuelven JSX. Sin `useEffect` de I/O.
- **Smart wrappers**: si una feature necesita orquestación, su hook (`use*`) la encapsula. El componente la consume via prop o hook propio.
- Compound components solo cuando hay >2 sub-piezas con estado compartido (no aplica hoy).
- Nunca exportar default componentes. Export nombrado para grep-friendly.

### 3.6 Logging

```ts
import { crearLogger } from '@/shared/lib/logger';

const log = crearLogger('eq.contenido');

log.info('inicializando');
log.warn('bridge tardando', { ms: 1500 });
log.error('aplicar-ajustes-fallo', error, { ajustes });
```

- Un logger por archivo. Nombre = path del módulo en notación punto.
- `info`/`warn`/`error` según semántica.
- En producción se respeta `drop_console` de Terser, así que esto **no** filtra logs en builds.

---

## 4. Comunicación entre contextos

Tres canales bien delimitados:

### 4.1 Popup → Background

`browser.runtime.sendMessage` con tipos en `services/mensajeria/contratos.ts`. Cliente en `services/mensajeria/clientePopup.ts`:

```ts
const respuesta = await enviarSolicitudBackground({ tipo: 'obtener-estado' });
```

Background registra **un único** `runtime.onMessage` que despacha por `tipo`. Cualquier nuevo mensaje requiere actualizar:

1. La unión `SolicitudPopup` en `services/mensajeria/contratos.ts`.
2. El type guard `esSolicitudPopup`.
3. Un caso en el switch del background.

TypeScript fuerza los 3 puntos (exhaustividad).

### 4.2 Background → Content script

`browser.tabs.sendMessage(tabId, …)` con `SolicitudContenido` (más restringida que la del popup: el content no necesita conocer mensajes de descarga, etc.).

Dos worlds en cada pestaña SoundCloud:
- **ISOLATED** (`content.ts`): scrapea DOM, simula clics.
- **MAIN** (`equalizer-main.ts`): ejecuta Web Audio sobre los `<audio>` de la página.

El content **isolated** es el único que habla con background vía runtime. El **main** se comunica con isolated por `window.postMessage`.

### 4.3 ISOLATED ↔ MAIN (puente del equalizador)

`services/puenteEqualizador/canales.ts` define los 3 canales:

| Canal | Dirección | Cuándo |
|---|---|---|
| `soundcloud-control:eq-ready` | MAIN → ISOLATED (broadcast) | El servidor MAIN está listo. |
| `soundcloud-control:eq-request` | ISOLATED → MAIN | Solicitud con `id` único. |
| `soundcloud-control:eq-response` | MAIN → ISOLATED | Respuesta con el mismo `id`. |

Toda solicitud lleva `id` (`sc-eq-${ts}-${seq}`). El cliente ISOLATED resuelve por correlación de id con timeout (1.5 s). Esto es necesario porque `postMessage` es broadcast: cualquiera puede leerlo.

### 4.4 Persistencia

`browser.storage.local` vía WXT `storage.defineItem`. Una clave por preferencia. El módulo **`services/almacenamiento/preferencias.ts`** centraliza:

| Clave | Tipo | Default |
|---|---|---|
| `local:idioma` | `Idioma` | navigator.language → 'en' |
| `local:tema` | `string` (hex) | `#ff5500` |
| `local:modo-apariencia` | `'dark' \| 'light'` | `dark` |
| `local:intervalo` | `2000 \| 4000 \| 8000` | `4000` |
| `local:mostrar-descarga-mp3` | `boolean` | `true` |
| `local:mostrar-slider-volumen` | `boolean` | `true` |
| `local:modo-compacto` | `boolean` | `false` |
| `local:version-notif-vista` | `string` | `''` |
| `soundcloud-control.equalizer` | `AjustesEqualizador` | preset `flat` |

Migración de claves legacy `sc-control-*` desde `localStorage` se ejecuta **una vez** (flag `local:legacy-settings-migrated`).

### 4.5 No usamos un store global

El estado de la extensión vive donde corresponde:

- Preferencias persistidas: `browser.storage.local` (single source of truth).
- Estado efímero del popup: `useState` local en App / hooks de feature.
- Estado del reproductor: lo mantiene SoundCloud; lo reflejamos consultándolo (polling cada 2-8 s).
- Estado del equalizador: persistido + replicado en cada tab content script + aplicado en MAIN.

**Rechazado** Preact Signals / Zustand / Redux: añade dependencia, ergonomía y mental model para un problema que se resuelve con `useState` + un hook por feature. Si alguna vista futura compartiera estado complejo entre 5+ componentes, reconsiderar (Preact Signals sería la elección por tamaño).

---

## 5. UI Architecture

### 5.1 Composición

`AplicacionPopup` (en `entrypoints/popup/App.tsx`) es el smart container. Recibe `preferenciasIniciales` desde `main.tsx`. Renderiza tres vistas según `vista`:

- `principal` → `BloqueCancion` + `ControlesReproductor` + `ControlVolumen` (o variante compacta).
- `ajustes` → `PantallaAjustes`.
- `equalizador` → `PantallaEqualizador`.

`OpcionesApp` (página `options/`) reusa **el mismo** `PantallaAjustes`. Ése es el patrón: si una pantalla es reusable entre superficies, vive en `componentes/` y consume props.

### 5.2 Hooks

Los hooks encapsulan toda la lógica que antes vivía en `App.tsx`:

| Hook | Responsabilidad |
|---|---|
| `useEstadoReproductor` | Polling `obtener-estado`, ejecución de acciones, ajuste de volumen. Devuelve `{ respuesta, ejecutarAccion, ajustarVolumen, recargar }`. |
| `useEqualizadorPopup` | Carga inicial, debounce de guardado (90 ms), aplicación de presets, restablecer. |
| `useNotificacionVersion` | Comprobación de release en GitHub al montar; gestión de notificación dismissable. |
| `useAtajosTeclado` | Espacio/K, J/L, F, S, R, M, +/- dentro del popup. |
| `useTraducciones` | Devuelve `t = TEXTOS[idioma]` y maneja `document.lang`/`title`. |

Cada hook recibe lo mínimo (idioma actual, refs, callbacks) y devuelve lo mínimo. Sin context global.

### 5.3 Accesibilidad

Mantenida desde la versión previa: IDs estables (`sc-popup-title`, `sc-popup-live-status`), `aria-live`, `aria-controls`, `aria-pressed`. Cualquier nuevo control debe declarar etiqueta accesible y, si es toggle, `aria-pressed`.

---

## 6. i18n

`features/i18n/textos.ts` exporta `TEXTOS: Record<Idioma, Textos>`. 20 idiomas. Type-safe: `Textos` es una interfaz cerrada con 130+ claves; añadir una clave fuerza actualizar todos los locales (TS error si falta).

Estrategia de fallback en cascada:
1. Idioma persistido (`local:idioma`).
2. `navigator.language` (con normalización: `zh-TW` → `zh-Hant`, `zh-*` → `zh-Hans`, `xx-YY` → `xx`).
3. `'en'`.

Lazy loading **no** se aplica: el popup vive offline en memoria mientras el navegador lo cachea. Cargar dinámicamente añade flicker. Si el bundle del popup superase 500 KB JS, reconsiderar.

Interpolaciones se modelan como funciones, no plantillas:

```ts
export interface Textos {
  volumenActual: (volumen: number) => string;
  abrirPaginaArtista: (artista: string) => string;
  // …
}
```

Esto da type-safety en parámetros (no se puede olvidar el argumento) y permite formateo per-locale.

---

## 7. Styling — Tailwind v4

### 7.1 Tokens

`@theme` en `entrypoints/popup/style.css` define los tokens de marca (paleta SoundCloud Media Kit + tipografías Inter/Geist). Tailwind v4 los expone como utilities (`text-sc-orange`, `bg-sc-grey-1`, etc).

Token dinámico **`--sc-theme-rgb`** (triple `r g b` sin coma) se inyecta desde `App.tsx` según el preset elegido. Cualquier estilo que dependa del color de tema:

```css
background: rgb(var(--sc-theme-rgb) / 0.32);
```

Esto da theming sin recompilar Tailwind y sin clases por preset.

### 7.2 Clases utilitarias `.sc-*`

Encapsulan combinaciones largas en `@layer components`. Convenciones:

- `data-active="true"` activa el resalte tematizado.
- `data-variant="soft"` para variantes secundarias.

Listado actual: `sc-card`, `sc-cover-fill`, `sc-veil`, `sc-pattern`, `sc-panel-bg`, `sc-section-title`, `sc-section-desc`, `sc-meta-pill`, `sc-btn`, `sc-btn-primary`, `sc-btn-soft`, `sc-btn-mode`, `sc-btn-icon`, `sc-btn-back`, `sc-btn-xs`, `sc-btn-xs-primary`, `sc-btn-download`, `sc-chip`, `sc-select`, `slider-volumen`, `slider-equalizer`.

**Regla:** si una combinación de utilities Tailwind se repite 3+ veces, se promueve a clase `.sc-*`.

### 7.3 Modo claro/oscuro

`document.body.dataset.uiMode = 'dark' | 'light'`. CSS sobreescribe variables y tokens en `body[data-ui-mode='light']`. No usamos `prefers-color-scheme` directamente porque la preferencia del usuario en la extensión gana.

### 7.4 Responsive

El popup tiene dos anchos fijos: 312 px normal, 480 px compacto (clase `.sc-compact` en `<body>`). La página de opciones es fluida (`width: 100%`). Sincronización de altura via `ResizeObserver` en `app/documento.ts` (antes `popup/documento.ts`).

---

## 8. Build, scripts y MV3

### 8.1 Scripts

- `pnpm dev` — Chromium dev con HMR.
- `pnpm dev:firefox` — Firefox dev.
- `pnpm build` / `build:firefox` — producción.
- `pnpm zip` / `zip:firefox` / `zip:all` — empaqueta para stores.
- `pnpm compile` — `tsc --noEmit` (CI).

### 8.2 Manifest

Definido en `wxt.config.ts` con manifest dual MV3/MV2:

- Chrome MV3: `equalizer-main.js` se declara como `content_scripts` con `world: 'MAIN'` directamente en el manifest. Así Chrome lo inyecta en cada navegación sin depender de `scripting.executeScript` (evita race conditions con el SW).
- Firefox: ese campo no aplica; se inyecta vía `scripting.executeScript` desde el SW.

### 8.3 Optimizaciones de build

- `target: 'esnext'`, `modulePreload.polyfill: false`.
- Terser con 3 passes, `drop_console`, `drop_debugger`, `unsafe_arrows`, `pure_getters`.
- Treeshake con anotaciones en Rolldown.
- Tipografías sólo en `woff2` (ie. `**/*.woff` excluido del zip).

### 8.4 Riesgos MV3 a vigilar

- **Service worker termina y se reinicia.** No persistir estado en variables del SW. Toda la persistencia va a `browser.storage`.
- **`scripting.executeScript` puede llegar tarde al SoundCloud DOM.** El cliente ISOLATED reintenta en cuanto recibe `eq-ready` desde MAIN aunque el primer ping fallara.
- **Inyección duplicada.** El content script protege con flag `__scControlLoaded`; el MAIN con `__scEqMainLoaded`. No se levantan dos contextos.

---

## 9. Performance — guidelines

- Polling de estado: 2 s mínimo, 4 s default. Más rápido degrada batería.
- El equalizador no recrea nodos en cada cambio: reutiliza `BiquadFilterNode`s y solo reconecta la cadena cuando cambia qué bandas están activas.
- El cliente ISOLATED del puente cachea el último estado y firma el snapshot para evitar logs duplicados.
- Componentes principales con props estables. Si se introduce uno nuevo y rerenderea por cambio de referencia, `useMemo`/`memo()` antes de añadir librerías.

---

## 10. Pendiente / próximos pasos

- Biome con plugin `boundaries` o `import/no-restricted-paths` para forzar las dependencias entre capas.
- Vitest + jsdom para `entities/equalizador/ajustes` (normalización, inferencia de preset, mezcla) y `services/mensajeria` (type guards). Es el código más puro y de mayor riesgo.
- Codemod de selectores en `content/selectores.ts` con telemetría local cuando ningún selector matchea.
- Refactor del cierre `servidorMain.ts` solo si crece otra responsabilidad encima.

---

## 11. Glosario rápido

- **AjustesEqualizador**: configuración persistible (10 bandas, preamp, habilitado, presetId).
- **EstadoEqualizador**: AjustesEqualizador + estado runtime (audio detectado, contexto, requiere interacción).
- **EstadoCancion**: snapshot del reproductor de SoundCloud (artista, título, volumen, modo repetición…).
- **EstadoVista**: enum de estado de la UI (`disponible | sin-pestana | sin-reproductor | cargando | error`).
- **Solicitud / Respuesta**: mensajes IPC tipados. Solicitud lleva `tipo` discriminante; Respuesta lleva forma según contexto destino.
- **Bridge / puente**: el canal `postMessage` ISOLATED↔MAIN para el equalizador.
