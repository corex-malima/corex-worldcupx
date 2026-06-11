import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Blindaje contra "Failed to fetch dynamically imported module".
// Tras un deploy, los chunks lazy (p. ej. el PDF) cambian de hash; una pestaña
// vieja intenta bajar el archivo anterior y falla. Cuando Vite avisa con
// `vite:preloadError`, recargamos UNA vez a la versión nueva (guardia anti-loop:
// si vuelve a fallar en <10s, dejamos pasar el error para no recargar infinito).
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'wcx:preload-reload-at';
  const now = Date.now();
  const last = Number(sessionStorage.getItem(KEY) ?? '0');
  if (now - last > 10000) {
    sessionStorage.setItem(KEY, String(now));
    event.preventDefault(); // evita el throw → no aparece el alert
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
