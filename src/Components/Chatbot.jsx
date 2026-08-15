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


// =====================================================
// CHATBOT COMPONENT
// =====================================================

const Chatbot = () => {

  const [isOpen, setIsOpen] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        role: 'bot',

        text:
          "Hey! I'm the Brew Haven barista bot ☕ — ask me about the menu, hours, or anything coffee related.",
      },
    ]);

  const [input, setInput] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);


  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });

  }, [messages, isOpen]);


  // ===================================================
  // SEND MESSAGE
  // ===================================================

  const sendMessage = async () => {

    const trimmed =
      input.trim();


    // -----------------------------------------------
    // Prevent empty message
    // -----------------------------------------------

    if (
      !trimmed ||
      isLoading
    ) {
      return;
    }


    // -----------------------------------------------
    // Add user message
    // -----------------------------------------------

    setMessages(
      (previousMessages) => [
        ...previousMessages,

        {
          role: 'user',
          text: trimmed,
        },
      ]
    );


    // -----------------------------------------------
    // Clear input
    // -----------------------------------------------

    setInput('');


    // -----------------------------------------------
    // Loading
    // -----------------------------------------------

    setIsLoading(true);


    try {

      console.log(
        'Sending message to Vercel API:',
        trimmed
      );


      // =================================================
      // API REQUEST
      // =================================================

      const response =
        await fetch(
          CHATBOT_URL,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              message: trimmed,
            }),
          }
        );


      console.log(
        'Vercel API response status:',
        response.status
      );


      // =================================================
      // READ RESPONSE
      // =================================================

      let data;

      try {

        data =
          await response.json();

      } catch (error) {

        console.error(
          'Response JSON error:',
          error
        );

        throw new Error(
          'Invalid response received from chatbot server.'
        );
      }


      console.log(
        'Vercel chatbot response:',
        data
      );


      // =================================================
      // SERVER ERROR
      // =================================================

      if (!response.ok) {

        throw new Error(
          data?.error ||
          'Chatbot server returned an error.'
        );
      }


      // =================================================
      // GET REPLY
      // =================================================

      const reply =
        data?.reply ||
        "Sorry, I couldn't generate a response.";


      // =================================================
      // ADD BOT MESSAGE
      // =================================================

      setMessages(
        (previousMessages) => [
          ...previousMessages,

          {
            role: 'bot',
            text: reply,
          },
        ]
      );


    } catch (error) {

      console.error(
        'Chatbot error:',
        error
      );


      // =================================================
      // ERROR MESSAGE
      // =================================================

      let errorMessage =
        "Couldn't reach the barista bot right now. Please try again.";


      const errorText =
        error?.message?.toLowerCase() ||
        '';


      // =================================================
      // NETWORK ERROR
      // =================================================

      if (
        errorText.includes(
          'failed to fetch'
        ) ||
        errorText.includes(
          'network'
        )
      ) {

        errorMessage =
          'Unable to connect to the chatbot server. Please try again.';
      }


      // =================================================
      // GROQ API KEY ERROR
      // =================================================

      else if (
        errorText.includes(
          'groq api key'
        ) ||
        errorText.includes(
          'not configured'
        )
      ) {

        errorMessage =
          'The chatbot API is not configured correctly on Vercel.';
      }


      // =================================================
      // AI SERVICE ERROR
      // =================================================

      else if (
        errorText.includes(
          'ai service'
        )
      ) {

        errorMessage =
          'The AI service is temporarily unavailable. Please try again.';
      }


      // =================================================
      // INVALID MESSAGE
      // =================================================

      else if (
        errorText.includes(
          'message string'
        )
      ) {

        errorMessage =
          'Please enter a valid message.';
      }


      // =================================================
      // MESSAGE TOO LONG
      // =================================================

      else if (
        errorText.includes(
          'message too long'
        )
      ) {

        errorMessage =
          'Your message is too long. Please keep it under 500 characters.';
      }


      // =================================================
      // ADD ERROR MESSAGE
      // =================================================

      setMessages(
        (previousMessages) => [
          ...previousMessages,

          {
            role: 'bot',
            text: errorMessage,
          },
        ]
      );


    } finally {

      setIsLoading(false);
    }
  };


  // ===================================================
  // ENTER KEY
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
  // TOGGLE CHATBOT
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
          FLOATING CHAT BUTTON
      ========================================== */}

      <button
        type="button"

        className={`chatbot-toggle ${
          isOpen ? 'open' : ''
        }`}

        onClick={
          toggleChatbot
        }

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
          CHAT WINDOW
      ========================================== */}

      <div
        className={`chatbot-window ${
          isOpen ? 'open' : ''
        }`}
      >

        {/* =======================================
            HEADER
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
            MESSAGES
        ======================================== */}

        <div className="chatbot-messages">

          {messages.map(
            (message, index) => (

              <div
                key={`${message.role}-${index}`}

                className={`chatbot-bubble ${
                  message.role
                }`}
              >
                {message.text}
              </div>

            )
          )}


          {/* =====================================
              TYPING
          ====================================== */}

          {isLoading && (

            <div
              className="
                chatbot-bubble
                bot
                chatbot-typing
              "
            >

              <span></span>
              <span></span>
              <span></span>

            </div>

          )}


          <div
            ref={messagesEndRef}
          />

        </div>


        {/* =======================================
            INPUT
        ======================================== */}

        <div className="chatbot-input-row">

          <input
            type="text"

            value={input}

            onChange={(event) =>
              setInput(
                event.target.value
              )
            }

            onKeyDown={
              handleKeyDown
            }

            placeholder="Ask about the menu..."

            className="chatbot-input"

            disabled={isLoading}

            maxLength={500}
          />


          {/* =====================================
              SEND BUTTON
          ====================================== */}

          <button
            type="button"

            className="chatbot-send"

            onClick={
              sendMessage
            }

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