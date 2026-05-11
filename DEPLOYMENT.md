# Automatización de Deployment a Chrome Web Store y Firefox Add-ons

Este documento describe cómo configurar la automatización de deployment para publicar SoundCloud Control en Chrome Web Store y Firefox Add-ons usando GitHub Actions.

## Cómo Funciona

El workflow se dispara automáticamente cuando se publica un release en GitHub. Realiza las siguientes acciones:

1. **Builds**: Genera los paquetes optimizados para Chrome y Firefox
2. **Firma Firefox**: Firma la extensión de Firefox con web-ext
3. **Publica en Firefox**: Publica automáticamente en Mozilla Add-on Store
4. **Publica en Chrome**: Publica automáticamente en Chrome Web Store
5. **Adjunta Artefactos**: Adjunta los archivos generados al release de GitHub

## Requisitos Previos

### Publicación Manual Inicial

Primero debes publicar la extensión manualmente en ambas tiendas al menos una vez:

- **Chrome Web Store**: 1-3 días de revisión
- **Firefox Add-ons**: 1-2 días de revisión

Esta publicación inicial es necesaria para obtener los IDs y credenciales de las APIs.

## Configuración de Secretos

Necesitas agregar los siguientes secretos a tu repositorio GitHub:

### 1. Secretos de Firefox

**FIREFOX_ISSUER** y **FIREFOX_SECRET**:
1. Inicia sesión en [addons.mozilla.org](https://addons.mozilla.org)
2. Ve a: Mis Extensiones → Herramientas → Claves API
3. Acepta los términos y copia:
   - **API Issuer** → Agrega como `FIREFOX_ISSUER`
   - **API Secret** → Agrega como `FIREFOX_SECRET`

### 2. Secretos de Chrome

**CHROME_CLIENT_ID**, **CHROME_CLIENT_SECRET**, **CHROME_REFRESH_TOKEN**:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Busca "Chrome Web Store API" y actívala
4. Ve a "Credenciales" y crea una credencial OAuth 2.0 (Desktop app)
5. Descarga el JSON de credenciales
6. Obtén el refresh token ejecutando:
   ```bash
   curl --location --request POST 'https://www.googleapis.com/oauth2/v4/token' \
     --header 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode 'client_id=YOUR_CLIENT_ID' \
     --data-urlencode 'client_secret=YOUR_CLIENT_SECRET' \
     --data-urlencode 'refresh_token=YOUR_REFRESH_TOKEN' \
     --data-urlencode 'grant_type=refresh_token'
   ```
7. Agrega los valores a los secretos:
   - `CHROME_CLIENT_ID`
   - `CHROME_CLIENT_SECRET`
   - `CHROME_REFRESH_TOKEN`

**CHROME_EXTENSION_ID**:
1. Ve a [Chrome Web Store](https://chrome.google.com/webstore)
2. Encuentra tu extensión
3. El ID es la cadena larga en la URL: `chrome.google.com/webstore/detail/XXXXXXXX...`
4. Agrega como `CHROME_EXTENSION_ID`

## Cómo Agregar los Secretos

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. En la barra lateral, haz clic en **Secrets and variables** → **Actions**
4. Haz clic en **New repository secret**
5. Agrega cada secreto con su nombre exacto

## Cómo Usar

1. Crea un tag con el versionado semántico:
   ```bash
   git tag v1.6.0
   git push origin v1.6.0
   ```

2. Ve a GitHub y crea un Release desde el tag
3. El workflow se ejecutará automáticamente
4. Los artefactos se adjuntarán al release una vez completado

## Monitoreo

Puedes monitorear el progreso del workflow en:
- **GitHub**: Actions → Workflow → Release Extension
- Verifica que el step "Publish to Chrome Web Store" y "Sign and Publish to Firefox" pasen sin errores

## Solución de Problemas

### Firefox: "web-ext sign" falla
- Verifica que `FIREFOX_ISSUER` y `FIREFOX_SECRET` sean correctos
- Asegúrate de que la extensión ya esté publicada en Mozilla Add-on Store
- Espera 1 hora después de obtener las credenciales antes de usarlas

### Chrome: No se publica
- Verifica los valores de `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET` y `CHROME_REFRESH_TOKEN`
- Confirma que `CHROME_EXTENSION_ID` es correcto
- Asegúrate de que la extensión ya esté en Chrome Web Store

### Los artefactos no se adjuntan al release
- Verifica que `GITHUB_TOKEN` está habilitado (por defecto está disponible)
- Confirma que los paths de artefactos son correctos

## Archivos Modificados

- `.github/workflows/release.yml` - Workflow principal
- `package.json` - Scripts de build CI y dependencia de web-ext

## Referencias

- [wxt Documentation](https://wxt.dev/)
- [web-ext Documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using_webstore_api/)
- [Firefox Add-ons API](https://addons-server.readthedocs.io/en/latest/topics/api/index.html)
