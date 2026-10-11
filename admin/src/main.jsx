import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProviders } from './context/AppProviders';
import { ToastProvider } from './components/common/ToastProvider';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
        <ToastProvider />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
