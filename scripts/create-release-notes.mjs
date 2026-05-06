import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rawTag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
const outputPath = process.argv[3] ?? path.join(rootDir, '.output', 'release-body.md');

if (!rawTag) {
  console.error('Falta el tag. Uso: node scripts/create-release-notes.mjs <tag> [outputPath]');
  process.exit(1);
}

const version = rawTag.replace(/^v/, '');
const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const changelog = fs.readFileSync(changelogPath, 'utf8');

if (packageJson.version !== version) {
  console.error(
    `El tag ${rawTag} no coincide con package.json (${packageJson.version}). ` +
      'Actualiza la versión antes de publicar.',
  );
  process.exit(1);
}

const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sectionRegex = new RegExp(
  `^## \\[${escapedVersion}\\] - (?<date>[^\n]+)\\n(?<body>[\\s\\S]*?)(?=^## \\[|\\Z)`,
  'm',
);

const match = changelog.match(sectionRegex);
const releaseDate = match?.groups?.date?.trim() ?? new Date().toISOString().slice(0, 10);
const changelogBody = (match?.groups?.body ?? '- Sin notas detalladas en CHANGELOG todavía.')
  .trim()
  .replace(/\n+---\s*$/m, '')
  .trim();

const releaseBody = `# SoundCloud Control v${version}

Release automática generada desde el tag \`${rawTag}\`.

## Cambios de esta versión

${changelogBody}

## Archivos adjuntos

- \`soundcloud-control-wxt-${version}-chrome.zip\`: paquete listo para Chrome / Chromium.
- \`soundcloud-control-wxt-${version}-firefox.zip\`: paquete listo para Firefox.
- \`soundcloud-control-wxt-${version}-sources.zip\`: código fuente empaquetado para revisión.

## Metadatos

- Versión: \`${version}\`
- Fecha: \`${releaseDate}\`
- Build: GitHub Actions
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${releaseBody}\n`, 'utf8');

console.log(`Release notes generadas en ${outputPath}`);