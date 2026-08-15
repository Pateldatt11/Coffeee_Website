import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import { getFunctions, httpsCallable } from 'firebase/functions';
// No need to import `app` — getFunctions() with no argument automatically
// uses the default Firebase app that firebase.jsx already initialized.

const functions = getFunctions();
const chatWithBarista = httpsCallable(functions, 'chatWithBarista');

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hey! I'm the Brew Haven barista bot ☕ — ask me about the menu, hours, or anything coffee related." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatWithBarista({ message: trimmed });
      const reply = result.data?.reply || "Sorry, something went wrong.";
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: "Couldn't reach the barista bot right now — try again in a bit." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 4L18 18M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <span className="chatbot-toggle-icon">☕</span>
        )}
      </button>

      {/* Chat window */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <span className="chatbot-header-icon">☕</span>
          <div>
            <p className="chatbot-header-title">Brew Haven Barista</p>
            <p className="chatbot-header-sub">Usually replies instantly</p>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chatbot-bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && (
            <div className="chatbot-bubble bot chatbot-typing">
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the menu..."
            className="chatbot-input"
            disabled={isLoading}
          />
          <button
            className="chatbot-send"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9L16 2L11 16L8 10L2 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;