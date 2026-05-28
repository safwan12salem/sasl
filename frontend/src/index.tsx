import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { MeshProvider } from './contexts/MeshContext';
import { Toaster } from 'react-hot-toast';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { saslBrain } from './services/saslBrain';
import { ThemeProvider } from './contexts/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}

saslBrain.initialize().then(() => {
  console.log('🧠 Sasl Brain ready');
});

root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ThemeProvider>
          <MeshProvider>
            <App />
            <Toaster position="top-right" />
          </MeshProvider>
        </ThemeProvider>
      </AuthProvider>
    </I18nextProvider>
  </React.StrictMode>
);