import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import { cargarPreferenciasPersistidas } from './storage.ts';

async function bootstrap() {
  const preferenciasIniciales = await cargarPreferenciasPersistidas();
  document.body.classList.toggle('sc-compact', preferenciasIniciales.modoCompacto);

  createRoot(document.getElementById('root')!).render(
    <App preferenciasIniciales={preferenciasIniciales} />,
  );
}

void bootstrap();
