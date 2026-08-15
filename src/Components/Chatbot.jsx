import React, {
  useState,
  useRef,
  useEffect,
} from 'react';

import './Chatbot.css';


// =====================================================
// VERCEL API
// =====================================================

const CHATBOT_URL = '/api/chat';

const QUICK_REPLIES = [
  'Menu ane prices batavo',
  'Aaj kitna baje band hoga?',
  'Best seller कौनसा आहे?',
  'Delivery available che?',
];


// =====================================================
// CHATBOT COMPONENT
// =====================================================

const Chatbot = () => {

  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true);

  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text:
        "Hey there! 👋 I'm Bru, your Brew Haven barista. Ask me anything — menu, hours, recommendations. Hindi, English, Marathi, Gujarati — jaadu bhasha ma vaat karo, hu samju chu!",
      time: getTime(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);


  // ===================================================
  // TIME HELPER
  // ===================================================

  function getTime() {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }


  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isOpen, isLoading]);


  // ===================================================
  // FOCUS INPUT ON OPEN
  // ===================================================

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);


  // ===================================================
  // SEND MESSAGE
  // ===================================================

  const sendMessage = async (overrideText) => {

    const trimmed = (overrideText ?? input).trim();

    if (!trimmed || isLoading) {
      return;
    }

    setMessages((previousMessages) => [
      ...previousMessages,
      { role: 'user', text: trimmed, time: getTime() },
    ]);

    setInput('');
    setIsLoading(true);

    try {

      const recentHistory = messages
        .slice(-6)
        .map(({ role, text }) => ({ role, text }));

      const response = await fetch(CHATBOT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: recentHistory,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch (error) {
        throw new Error('Invalid response received from chatbot server.');
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Chatbot server returned an error.');
      }

      const reply = data?.reply || "Sorry, I couldn't generate a response.";

      setMessages((previousMessages) => [
        ...previousMessages,
        { role: 'bot', text: reply, time: getTime() },
      ]);

      if (!isOpen) {
        setHasNewMessage(true);
      }

    } catch (error) {

      let errorMessage =
        "Couldn't reach the barista bot right now. Please try again.";

      const errorText = error?.message?.toLowerCase() || '';

      if (errorText.includes('failed to fetch') || errorText.includes('network')) {
        errorMessage = 'Unable to connect to the chatbot server. Please try again.';
      } else if (errorText.includes('groq api key') || errorText.includes('not configured')) {
        errorMessage = 'The chatbot API is not configured correctly on Vercel.';
      } else if (errorText.includes('ai service')) {
        errorMessage = 'The AI service is temporarily unavailable. Please try again.';
      } else if (errorText.includes('message string')) {
        errorMessage = 'Please enter a valid message.';
      } else if (errorText.includes('message too long')) {
        errorMessage = 'Your message is too long. Please keep it under 500 characters.';
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        { role: 'bot', text: errorMessage, time: getTime(), isError: true },
      ]);

    } finally {
      setIsLoading(false);
    }
  };


  // ===================================================
  // ENTER KEY
  // ===================================================

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };


  // ===================================================
  // TOGGLE CHATBOT
  // ===================================================

  const toggleChatbot = () => {
    setIsOpen((previousState) => !previousState);
  };


  // ===================================================
  // JSX
  // ===================================================

  return (
    <>
      {/* =========================================
          FLOATING CHAT BUTTON
      ========================================== */}

      <button
        type="button"
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleChatbot}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <path
              d="M4 4L18 18M18 4L4 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <span className="chatbot-toggle-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4.5C4 3.67 4.67 3 5.5 3h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16 4 15.33 4 14.5v-10Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="8.3" cy="9.3" r="1.05" fill="currentColor" />
              <circle cx="12" cy="9.3" r="1.05" fill="currentColor" />
              <circle cx="15.7" cy="9.3" r="1.05" fill="currentColor" />
            </svg>
          </span>
        )}
        {!isOpen && hasNewMessage && <span className="chatbot-toggle-dot" />}
      </button>


      {/* =========================================
          CHAT WINDOW
      ========================================== */}

      <div className={`chatbot-window ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Brew Haven chat">

        {/* =======================================
            HEADER
        ======================================== */}

        <div className="chatbot-header">
          <div className="chatbot-header-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 8h13a2 2 0 0 1 2 2v1.5a3.5 3.5 0 0 1-3.5 3.5H17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M7 4.5c.3.7-.2 1-.2 1.6M10.5 4.5c.3.7-.2 1-.2 1.6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="chatbot-header-text">
            <p className="chatbot-header-title">Brew Haven</p>
            <p className="chatbot-header-sub">
              <span className="chatbot-status-dot" />
              Bru is online
            </p>
          </div>

          <button
            type="button"
            className="chatbot-header-close"
            onClick={toggleChatbot}
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <path
                d="M4 4L18 18M18 4L4 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>


        {/* =======================================
            MESSAGES
        ======================================== */}

        <div className="chatbot-messages">

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chatbot-row ${message.role}`}
            >
              <div
                className={`chatbot-bubble ${message.role} ${
                  message.isError ? 'error' : ''
                }`}
              >
                {message.text}
              </div>
              <span className="chatbot-time">
                {message.time}
                {message.role === 'user' && (
                  <svg
                    className="chatbot-tick"
                    width="13"
                    height="9"
                    viewBox="0 0 16 11"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 5.5L5 9.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.5 5.5L9.5 9.5L15.5 1.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </div>
          ))}

          {/* =====================================
              QUICK REPLIES
          ====================================== */}

          {messages.length === 1 && !isLoading && (
            <div className="chatbot-quick-replies">
              {QUICK_REPLIES.map((quickReply) => (
                <button
                  key={quickReply}
                  type="button"
                  className="chatbot-quick-reply"
                  onClick={() => sendMessage(quickReply)}
                >
                  {quickReply}
                </button>
              ))}
            </div>
          )}

          {/* =====================================
              TYPING
          ====================================== */}

          {isLoading && (
            <div className="chatbot-row bot">
              <div className="chatbot-bubble bot chatbot-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

        </div>


        {/* =======================================
            INPUT
        ======================================== */}

        <div className="chatbot-input-row">

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type in any language..."
            className="chatbot-input"
            disabled={isLoading}
            maxLength={500}
          />

          <button
            type="button"
            className="chatbot-send"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 9L16 2L11 16L8 10L2 9Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>

        </div>

        <p className="chatbot-footer-note">Brew Haven · usually replies in a few seconds</p>

      </div>
    </>
  );
};


export default Chatbot;