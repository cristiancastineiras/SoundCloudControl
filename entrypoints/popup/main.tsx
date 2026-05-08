import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import {
  aplicarLayoutCompactoPopup,
  aplicarModoAparienciaDocumento,
} from '@/app/documento';
import { cargarPreferenciasPersistidas } from '@/services/almacenamiento';

async function bootstrap() {
  const preferenciasIniciales = await cargarPreferenciasPersistidas();
  aplicarModoAparienciaDocumento(preferenciasIniciales.modoApariencia);
  aplicarLayoutCompactoPopup(preferenciasIniciales.modoCompacto);

  createRoot(document.getElementById('root')!).render(
    <App preferenciasIniciales={preferenciasIniciales} />,
  );
}

void bootstrap();
