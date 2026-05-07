import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '../popup/style.css';
import { cargarPreferenciasPersistidas } from '../popup/storage';

async function bootstrap() {
  const preferenciasIniciales = await cargarPreferenciasPersistidas();

  createRoot(document.getElementById('root')!).render(
    <App preferenciasIniciales={preferenciasIniciales} />,
  );
}

void bootstrap();
