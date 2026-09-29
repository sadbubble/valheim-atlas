import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { App } from './app/App';
import './app/app.css';

// The production build's Content-Security-Policy forbids eval (vite.config.ts). zod would
// otherwise probe `new Function` for its JIT, which the browser reports as a CSP violation.
z.config({ jitless: true });

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
