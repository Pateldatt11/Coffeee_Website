import React, {
  useState,
  useRef,
  useEffect,
} from 'react';

import './Chatbot.css';

import {
  getFunctions,
  httpsCallable,
} from 'firebase/functions';


// =====================================================
// Firebase Functions
// =====================================================

const functions = getFunctions();

const chatWithBarista = httpsCallable(
  functions,
  'chatWithBarista'
);


// =====================================================
// Chatbot Component
// =====================================================

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text:
        "Hey! I'm the Brew Haven barista bot ☕ — ask me about the menu, hours, or anything coffee related.",
    },
  ]);

  const [input, setInput] = useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);


  // ===================================================
  // Auto scroll
  // ===================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isOpen]);


  // ===================================================
  // Send message
  // ===================================================

  const sendMessage = async () => {
    const trimmed = input.trim();

    if (!trimmed || isLoading) {
      return;
    }

    // Add user message
    setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: 'user',
        text: trimmed,
      },
    ]);

    // Clear input
    setInput('');

    // Start loading
    setIsLoading(true);

    try {
      console.log(
        'Sending message to Firebase Function:',
        trimmed
      );

      // Call Firebase Callable Function
      const result =
        await chatWithBarista({
          message: trimmed,
        });

      console.log(
        'Firebase Function result:',
        result
      );

      const reply =
        result?.data?.reply ||
        "Sorry, I couldn't generate a response.";

      // Add bot response
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: 'bot',
          text: reply,
        },
      ]);
    } catch (error) {
      console.error(
        'Chatbot error:',
        error
      );

      let errorMessage =
        "Couldn't reach the barista bot right now. Please try again.";

      // Firebase error handling

      if (
        error?.code ===
        'functions/invalid-argument'
      ) {
        errorMessage =
          'Please enter a valid message.';
      }

      if (
        error?.code ===
        'functions/failed-precondition'
      ) {
        errorMessage =
          'The chatbot is not configured correctly. Please check the Gemini API key.';
      }

      if (
        error?.code ===
        'functions/internal'
      ) {
        errorMessage =
          'The chatbot server encountered an error. Please try again.';
      }

      if (
        error?.code ===
        'functions/unavailable'
      ) {
        errorMessage =
          'The chatbot service is temporarily unavailable.';
      }

      // Add error message
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: 'bot',
          text: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  // ===================================================
  // Enter key
  // ===================================================

  const handleKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };


  // ===================================================
  // Toggle chatbot
  // ===================================================

  const toggleChatbot = () => {
    setIsOpen(
      (previousState) => !previousState
    );
  };


  // ===================================================
  // JSX
  // ===================================================

  return (
    <>
      {/* =========================================
          Floating Chat Button
      ========================================== */}

      <button
        type="button"
        className={`chatbot-toggle ${
          isOpen ? 'open' : ''
        }`}
        onClick={toggleChatbot}
        aria-label={
          isOpen
            ? 'Close chat'
            : 'Open chat'
        }
      >
        {isOpen ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
          >
            <path
              d="M4 4L18 18M18 4L4 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <span className="chatbot-toggle-icon">
            ☕
          </span>
        )}
      </button>


      {/* =========================================
          Chat Window
      ========================================== */}

      <div
        className={`chatbot-window ${
          isOpen ? 'open' : ''
        }`}
      >

        {/* Header */}

        <div className="chatbot-header">
          <span className="chatbot-header-icon">
            ☕
          </span>

          <div>
            <p className="chatbot-header-title">
              Brew Haven Barista
            </p>

            <p className="chatbot-header-sub">
              Usually replies instantly
            </p>
          </div>
        </div>


        {/* Messages */}

        <div className="chatbot-messages">

          {messages.map(
            (message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chatbot-bubble ${message.role}`}
              >
                {message.text}
              </div>
            )
          )}


          {/* Loading animation */}

          {isLoading && (
            <div className="chatbot-bubble bot chatbot-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}


          <div
            ref={messagesEndRef}
          />

        </div>


        {/* Input */}

        <div className="chatbot-input-row">

          <input
            type="text"
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask about the menu..."
            className="chatbot-input"
            disabled={isLoading}
            maxLength={500}
          />


          <button
            type="button"
            className="chatbot-send"
            onClick={sendMessage}
            disabled={
              isLoading ||
              !input.trim()
            }
            aria-label="Send message"
          >

            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <path
                d="M2 9L16 2L11 16L8 10L2 9Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

          </button>

        </div>

      </div>
    </>
  );
};

export default Chatbot;