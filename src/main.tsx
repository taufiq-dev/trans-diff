import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { TooltipProvider } from '@/components/ui/tooltip';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider delay={400}>
      <App />
    </TooltipProvider>
  </StrictMode>,
);
