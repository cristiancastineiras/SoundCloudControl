# Versioning y Release Strategy

## Overview

- **Versioning** → Controlar versiones del proyecto (`1.0.0`, `1.1.0`, etc.)
- **Changelog** → Documentar qué cambios se han realizado en cada release
- **Release Process** → Automatizar commits, tags y publicación

---

# Semantic Versioning (SemVer)

La convención recomendada es **Semantic Versioning**.

Formato:

```txt
MAJOR.MINOR.PATCH
```

## Ejemplos

| Versión | Descripción |
|---------|-------------|
| `1.0.0` | Primera versión estable |
| `1.0.1` | Bugfix menor |
| `1.1.0` | Nueva funcionalidad compatible |
| `2.0.0` | Cambio incompatible (breaking change) |

## Reglas

### PATCH (`x.x.1`)
Usar para:

- Bug fixes
- Hotfixes
- Mejoras internas sin cambiar comportamiento público

Ejemplo:

```txt
1.0.0 → 1.0.1
```

---

### MINOR (`x.1.x`)
Usar para:

- Nuevas funcionalidades
- Nuevas integraciones
- Nuevas capacidades compatibles

Ejemplo:

```txt
1.0.0 → 1.1.0
```

---

### MAJOR (`2.x.x`)
Usar para:

- Breaking changes
- Cambios en APIs
- Cambios de arquitectura incompatibles

Ejemplo:

```txt
1.4.0 → 2.0.0
```

---

# Estructura recomendada

```txt
my-skill/
├── src/
├── package.json
├── CHANGELOG.md
├── README.md
```

---

# Gestión de versión

## package.json

La versión se define aquí:

```json
{
  "name": "my-agent-skill",
  "version": "1.0.0"
}
```

## Actualizar versión

### Patch

```bash
pnpm version patch
```

### Minor

```bash
pnpm version minor
```

### Major

```bash
pnpm version major
```

Esto actualiza la versión y crea automáticamente un tag en Git.

---

# CHANGELOG

Se recomienda usar el estándar **Keep a Changelog**.

## Ejemplo

```md
# Changelog

Todos los cambios importantes del proyecto se documentan aquí.

## [1.2.0] - 2026-05-01

### Added
- Añadido soporte para autenticación automática
- Nueva interfaz de configuración

### Changed
- Optimización de rendimiento

### Fixed
- Corregido problema de persistencia de datos

---

## [1.1.0] - 2026-04-25

### Added
- Soporte multiplataforma
- Integración con storage sincronizado

### Fixed
- Corrección de errores de carga

---

## [1.0.0] - 2026-04-20

### Added
- Primera release pública
- Configuración inicial
- Sistema base de ejecución
```

---

# Workflow de desarrollo

## 1. Commits con convención

Usar **Conventional Commits**:

```bash
git commit -m "feat: add storage support"
git commit -m "fix: resolve auth bug"
git commit -m "refactor: simplify execution flow"
```

## Tipos comunes

| Tipo | Uso |
|------|------|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de errores |
| `docs:` | Documentación |
| `refactor:` | Refactor interno |

---

## 2. Incrementar versión

Si se añadió una nueva funcionalidad:

```bash
pnpm version minor
```

Resultado:

```txt
1.0.0 → 1.1.0
```

---

## 3. Actualizar CHANGELOG

Añadir la nueva entrada con los cambios realizados.

---

## 4. Crear release

Publicar commits y tags:

```bash
git push origin main --tags
```

Si trabajas con GitHub, luego puedes generar releases desde los tags.

---

# Estrategia recomendada

Durante desarrollo:

```txt
0.x.x
```

Primera versión pública:

```txt
1.0.0
```

Nuevas features:

```txt
1.x.x
```

Cambios incompatibles:

```txt
2.x.x
```

## Ejemplo real

```txt
0.1.0 → estructura inicial
0.2.0 → sistema de storage
0.2.1 → corrección de permisos
0.3.0 → soporte multiplataforma
1.0.0 → release estable
```

---

Esta estrategia permite mantener trazabilidad, estabilidad y releases predecibles 