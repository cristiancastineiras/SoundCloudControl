// JS para eliminar todos los archivos .zip de la carpeta .output (ESM)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, '..', '.output');

if (!fs.existsSync(outputDir)) {
    console.log('La carpeta .output no existe, nada que borrar.');
    process.exit(0);
}

for (const file of fs.readdirSync(outputDir)) {
    if (file.endsWith('.zip')) {
        fs.unlinkSync(path.join(outputDir, file));
        console.log(`${file} eliminado`);
    }
}