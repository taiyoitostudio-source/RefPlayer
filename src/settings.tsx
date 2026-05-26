import React from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsWindow } from './components/SettingsWindow';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('settings-root')!).render(
  <React.StrictMode>
    <SettingsWindow />
  </React.StrictMode>,
);
