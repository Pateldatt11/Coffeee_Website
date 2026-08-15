import React, {
  useState,
  useRef,
  useEffect,
} from 'react';

import './Chatbot.css';


// =====================================================
// Firebase HTTP Function URL
// =====================================================

const CHATBOT_URL =
  'https://us-central1-coofee-website.cloudfunctions.net/chatWithBarista';


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
  // Auto Scroll
  // ===================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isOpen]);


  // ===================================================
  // Send Message
  // ===================================================

  const sendMessage = async () => {
    const trimmed = input.trim();

    // Prevent empty messages
    if (!trimmed || isLoading) {
      return;
    }


    // =================================================
    // Add User Message
    // =================================================

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


      // =================================================
      // Send HTTP POST Request
      // =================================================

      const response = await fetch(
        CHATBOT_URL,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            message: trimmed,
          }),
        }
      );


      console.log(
        'Firebase HTTP response status:',
        response.status
      );


      // =================================================
      // Read Response
      // =================================================

      let data;

      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(
          'Failed to parse Firebase response:',
          jsonError
        );

        throw new Error(
          'Invalid response received from chatbot server.'
        );
      }


      console.log(
        'Firebase Function response:',
        data
      );


      // =================================================
      // Server Error
      // =================================================

      if (!response.ok) {
        throw new Error(
          data?.error ||
          'Chatbot server returned an error.'
        );
      }


      // =================================================
      // Get Bot Reply
      // =================================================

      const reply =
        data?.reply ||
        "Sorry, I couldn't generate a response.";


      // =================================================
      // Add Bot Response
      // =================================================

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


      // =================================================
      // Error Message
      // =================================================

      let errorMessage =
        "Couldn't reach the barista bot right now. Please try again.";


      // =================================================
      // Error Handling
      // =================================================

      const errorText =
        error?.message?.toLowerCase() || '';


      if (
        errorText.includes('failed to fetch') ||
        errorText.includes('network')
      ) {
        errorMessage =
          'Unable to connect to the chatbot server. Please check your internet connection and try again.';
      }


      if (
        errorText.includes('gemini')
      ) {
        errorMessage =
          'The AI service is currently unavailable. Please try again later.';
      }


      if (
        errorText.includes('message string')
      ) {
        errorMessage =
          'Please enter a valid message.';
      }


      if (
        errorText.includes('message too long')
      ) {
        errorMessage =
          'Your message is too long. Please keep it under 500 characters.';
      }


      // =================================================
      // Add Error Message
      // =================================================

      setMessages((previousMessages) => [
        ...previousMessages,

        {
          role: 'bot',
          text: errorMessage,
        },
      ]);

    } finally {

      // Stop loading
      setIsLoading(false);
    }
  };


  // ===================================================
  // Enter Key Handler
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
  // Toggle Chatbot
  // ===================================================

  const toggleChatbot = () => {

    setIsOpen(
      (previousState) =>
        !previousState
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

        {/* =======================================
            Header
        ======================================== */}

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


        {/* =======================================
            Messages
        ======================================== */}

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


          {/* =====================================
              Loading Animation
          ====================================== */}

          {isLoading && (

            <div
              className="chatbot-bubble bot chatbot-typing"
            >

              <span></span>
              <span></span>
              <span></span>

            </div>

          )}


          {/* Auto Scroll Reference */}

          <div
            ref={messagesEndRef}
          />

        </div>


        {/* =======================================
            Input Area
        ======================================== */}

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


          {/* =====================================
              Send Button
          ====================================== */}

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