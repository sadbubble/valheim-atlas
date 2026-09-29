import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { DebugApp } from './DebugApp';
import './debug.css';

// No eval under the build's Content-Security-Policy (see src/main.tsx).
z.config({ jitless: true });

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <DebugApp />
  </StrictMode>,
);
