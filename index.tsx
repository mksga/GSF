import React from 'react';
// ИЗМЕНЕНО: Импортируем как * (весь модуль), чтобы корректно работать с importmap и subpath 'react-dom/client'
import * as ReactDOM from 'react-dom/client'; 
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Примечание: Используем ReactDOM.createRoot из импортированного модуля
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);