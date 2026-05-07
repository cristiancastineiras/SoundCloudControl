import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import { leerModoCompacto } from './preferencias.ts';

// Apply compact body class before first render to avoid layout shift
if (leerModoCompacto()) {
  document.body.classList.add('sc-compact');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
