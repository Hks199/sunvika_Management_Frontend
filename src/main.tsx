import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './state/auth';
import App from './App';
import { ThemeProvider } from './theme';
import './dark-theme.css';
import './styles.css';
import './brand-theme.css';
import './dark-theme.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider></BrowserRouter></React.StrictMode>);
