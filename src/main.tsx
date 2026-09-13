import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Filter out cross-origin third-party script errors from CDN widgets
window.addEventListener('error', (event) => {
  if (
    event.message === 'Script error.' ||
    event.filename?.includes('tradingview.com') ||
    event.filename?.includes('tv.js')
  ) {
    // Suppress noise from external CDN scripts
    event.preventDefault();
    return true;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
