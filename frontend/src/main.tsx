import React from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
// Imported for the side effect of initialising i18next before the first
// render, so no component ever sees a raw translation key.
import '@/lib/i18n';
import App from './App';

const container = document.getElementById('root');

const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
