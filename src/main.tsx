import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge any legacy caches
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      if (key.startsWith('spy-station-v1') || key === 'spy-station-cache') {
        caches.delete(key);
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
