import React from 'react';
import ReactDOM from 'react-dom/client';
import Chatbot from './Chatbot';
import './index.css';

ReactDOM.createRoot(document.getElementById('chatbot-root')).render(
  <React.StrictMode>
    <Chatbot />
  </React.StrictMode>,
);
