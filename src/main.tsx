import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Conditionally register PWA service worker for staff routes only in production
if (import.meta.env.PROD && !window.location.pathname.startsWith('/customer')) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  }).catch(err => console.error("SW Registration failed:", err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
