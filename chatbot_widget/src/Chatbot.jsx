import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm IntelliBot. Ask me about our latest fashion trends, sizing, shipping, or returns!", sender: "bot" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { text: userMsg, sender: "user" }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${atob('Z3NrX3BQcDRDSmNjQXFLclB5MGxHUkxFV0dyeWIzRllCY0dVejV3OWRaemI4UUpIa2lPME5Qa2c=')}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          temperature: 1,
          max_completion_tokens: 1024,
          top_p: 1,
          reasoning_effort: 'medium',
          stop: null,
          messages: [
            { role: 'system', content: 'You are IntelliBot, a helpful AI fashion assistant for an e-commerce platform called Intellishop. Keep the answers concise and friendly.' },
            ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
            { role: 'user', content: userMsg }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setMessages(prev => [...prev, { text: data.choices[0].message.content, sender: "bot" }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { text: `API Error: ${data.error.message}`, sender: "bot" }]);
      } else {
        setMessages(prev => [...prev, { text: "I'm having trouble connecting right now. Please try again later.", sender: "bot" }]);
      }
    } catch (error) {
      console.error('Error fetching from Groq API:', error);
      setMessages(prev => [...prev, { text: "I encountered an error. Please contact support.", sender: "bot" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="cb-bubble" onClick={() => setIsOpen(true)}>
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bot-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="50%" stopColor="#F472B6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="url(#bot-gradient)" />
            <line x1="50" y1="24" x2="50" y2="12" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="12" r="5" fill="#ffffff" />
            <rect x="22" y="30" width="56" height="42" rx="14" fill="#ffffff" />
            <circle cx="38" cy="44" r="6" fill="#4B5563" />
            <circle cx="62" cy="44" r="6" fill="#4B5563" />
            <path d="M40 56 Q50 64 60 56" stroke="#4B5563" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      )}

      {isOpen && (
        <div className="cb-window">
          <div className="cb-header">
            <span>IntelliBot (Fashion Expert)</span>
            <button className="cb-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="cb-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`cb-msg ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {isTyping && <div className="cb-typing">IntelliBot is typing...</div>}
          
          <div className="cb-input-area">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about sizing or styles..." 
            />
            <button onClick={handleSend}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
