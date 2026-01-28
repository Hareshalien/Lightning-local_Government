import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GEMINI_API_KEY } from './constants';

// Shim process.env for the @google/genai SDK requirement in the browser
// The system prompt explicitly says the SDK uses process.env.API_KEY.
// Since this is a client-side app, we mock it here using the user-provided key.
// In a real build pipeline, this would be injected via actual env variables.
if (typeof window !== 'undefined') {
  (window as any).process = {
    env: {
      API_KEY: GEMINI_API_KEY
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
