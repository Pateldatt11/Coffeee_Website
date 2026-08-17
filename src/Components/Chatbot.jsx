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

const FEEDBACK_STORAGE_KEY =
  'brewhaven_chat_feedback';


// =====================================================
// QUICK REPLIES
// =====================================================

const QUICK_REPLIES = [
  'Show me the menu & prices',
  'What time do you close today?',
  "What's your best seller?",
  'Do you deliver?',
];


// =====================================================
// FEEDBACK STORAGE
// =====================================================

function saveFeedback(entry) {

  try {

    const existing =
      JSON.parse(
        localStorage.getItem(
          FEEDBACK_STORAGE_KEY
        ) || '[]'
      );

    existing.push({
      ...entry,
      savedAt:
        new Date().toISOString(),
    });

    localStorage.setItem(
      FEEDBACK_STORAGE_KEY,
      JSON.stringify(existing)
    );

  } catch (error) {

    console.error(
      'Could not save feedback:',
      error
    );

  }
}


// =====================================================
// COMPONENT
// =====================================================

const Chatbot = () => {

  // ===================================================
  // STATE
  // ===================================================

  const [isOpen, setIsOpen] =
    useState(false);

  const [hasNewMessage, setHasNewMessage] =
    useState(true);

  const [messages, setMessages] =
    useState([
      {
        role: 'bot',

        text:
          "Hey there! 👋 I'm Bru, your Brew Haven AI assistant. Ask me about the menu, prices, hours, recommendations, or even general questions.",

        time: getTime(),
      },
    ]);

  const [input, setInput] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(false);


  // ===================================================
  // REFS
  // ===================================================

  const messagesEndRef =
    useRef(null);

  const inputRef =
    useRef(null);


  // ===================================================
  // TIME HELPER
  // ===================================================

  function getTime() {

    return new Date().toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

  }


  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });

  }, [
    messages,
    isOpen,
    isLoading,
  ]);


  // ===================================================
  // FOCUS INPUT
  // ===================================================

  useEffect(() => {

    if (isOpen) {

      setHasNewMessage(false);

      const timer =
        setTimeout(() => {

          inputRef.current?.focus();

        }, 250);

      return () =>
        clearTimeout(timer);
    }

  }, [isOpen]);


  // ===================================================
  // SEND MESSAGE
  // ===================================================

  const sendMessage = async (
    overrideText
  ) => {

    const trimmed =
      (
        overrideText ??
        input
      ).trim();


    // Do nothing for empty message
    if (
      !trimmed ||
      isLoading
    ) {
      return;
    }


    // =================================================
    // ADD USER MESSAGE
    // =================================================

    setMessages(
      (previousMessages) => [

        ...previousMessages,

        {
          role: 'user',
          text: trimmed,
          time: getTime(),
        },

      ]
    );


    // Clear input
    setInput('');

    // Show loading
    setIsLoading(true);


    try {

      // =================================================
      // BUILD HISTORY
      //
      // Send last 12 messages to backend.
      // =================================================

      const recentHistory =
        messages
          .slice(-12)
          .map(
            ({
              role,
              text,
            }) => ({
              role,
              text,
            })
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

              history:
                recentHistory,

            }),
          }
        );


      // =================================================
      // READ RESPONSE
      // =================================================

      let data;

      try {

        data =
          await response.json();

      } catch (error) {

        throw new Error(
          'Invalid response received from chatbot server.'
        );

      }


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
      // AI RESPONSE
      // =================================================

      const reply =
        data?.reply ||
        "Sorry, I couldn't generate a response.";


      // =================================================
      // ADD BOT RESPONSE
      // =================================================

      setMessages(
        (previousMessages) => [

          ...previousMessages,

          {
            role: 'bot',

            text: reply,

            time: getTime(),

            userQuestion:
              trimmed,

            feedback: null,

            source:
              data?.source || 'groq',
          },

        ]
      );


      // =================================================
      // NEW MESSAGE DOT
      // =================================================

      if (!isOpen) {

        setHasNewMessage(true);

      }


    } catch (error) {

      console.error(
        'Chatbot error:',
        error
      );


      // =================================================
      // USER FRIENDLY ERROR
      // =================================================

      let errorMessage =
        "I couldn't reach the AI assistant right now. Please try again.";


      const errorText =
        error?.message
          ?.toLowerCase() || '';


      if (
        errorText.includes(
          'failed to fetch'
        ) ||
        errorText.includes(
          'network'
        )
      ) {

        errorMessage =
          'Unable to connect to the chatbot server. Please check your internet connection and try again.';

      } else if (
        errorText.includes(
          'api key'
        ) ||
        errorText.includes(
          'not configured'
        )
      ) {

        errorMessage =
          'The chatbot API is not configured correctly on Vercel.';

      } else if (
        errorText.includes(
          'message string'
        )
      ) {

        errorMessage =
          'Please enter a valid message.';

      } else if (
        errorText.includes(
          'message too long'
        )
      ) {

        errorMessage =
          'Your message is too long. Please keep it under 500 characters.';

      }


      // =================================================
      // SHOW ERROR MESSAGE
      // =================================================

      setMessages(
        (previousMessages) => [

          ...previousMessages,

          {
            role: 'bot',

            text: errorMessage,

            time: getTime(),

            isError: true,

          },

        ]
      );

    } finally {

      setIsLoading(false);

    }

  };


  // ===================================================
  // FEEDBACK
  // ===================================================

  const handleFeedback = (
    index,
    value
  ) => {

    setMessages(
      (previousMessages) =>

        previousMessages.map(
          (message, i) =>

            i === index

              ? {
                  ...message,
                  feedback: value,
                }

              : message
        )
    );


    const target =
      messages[index];


    saveFeedback({

      question:
        target?.userQuestion ||
        null,

      answer:
        target?.text,

      rating:
        value,

    });

  };


  // ===================================================
  // ENTER KEY
  // ===================================================

  const handleKeyDown = (
    event
  ) => {

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

      {/* =================================================
          FLOATING CHAT BUTTON
      ================================================= */}

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
            width="20"
            height="20"
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

          <span
            className="chatbot-toggle-icon"
            aria-hidden="true"
          >

            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >

              <path
                d="M6 15.5c-1.4-.55-2.4-1.7-2.4-3.05 0-1.87 1.9-3.38 4.25-3.38h7.3c2.35 0 4.25 1.5 4.25 3.38 0 1.87-1.9 3.38-4.25 3.38"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <path
                d="M4.5 9.6h13.2v6.3c0 2.15-1.83 3.9-4.08 3.9H8.58c-2.25 0-4.08-1.75-4.08-3.9V9.6Z"
                fill="currentColor"
                fillOpacity="0.16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              <path
                d="M4 20.2h13.2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <path
                d="M9 3.2c-.6.75-.6 1.3 0 2.05M12.3 3.2c-.6.75-.6 1.3 0 2.05"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />

            </svg>

          </span>

        )}

        {!isOpen &&
          hasNewMessage && (
            <span className="chatbot-toggle-dot" />
          )}

      </button>


      {/* =================================================
          CHAT WINDOW
      ================================================= */}

      <div
        className={`chatbot-window ${
          isOpen ? 'open' : ''
        }`}
        role="dialog"
        aria-label="Brew Haven AI chat"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="chatbot-header">

          <div className="chatbot-header-avatar">

            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >

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

            <p className="chatbot-header-title">
              Brew Haven
            </p>

            <p className="chatbot-header-sub">

              <span className="chatbot-status-dot" />

              Bru AI is online

            </p>

          </div>


          <button
            type="button"
            className="chatbot-header-close"
            onClick={toggleChatbot}
            aria-label="Close chat"
          >

            <svg
              width="16"
              height="16"
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

          </button>

        </div>


        {/* =================================================
            MESSAGES
        ================================================= */}

        <div className="chatbot-messages">

          {messages.map(
            (
              message,
              index
            ) => (

              <div
                key={`${message.role}-${index}`}
                className={`chatbot-row ${
                  message.role
                }`}
              >

                <div
                  className={`chatbot-bubble ${
                    message.role
                  } ${
                    message.isError
                      ? 'error'
                      : ''
                  }`}
                >

                  {message.text}

                </div>


                {/* =================================================
                    FEEDBACK
                ================================================= */}

                {message.role === 'bot' &&
                  !message.isError &&
                  index !== 0 && (

                    <div className="chatbot-feedback">

                      <button
                        type="button"
                        className={`chatbot-feedback-btn ${
                          message.feedback ===
                          'up'
                            ? 'active'
                            : ''
                        }`}
                        onClick={() =>
                          handleFeedback(
                            index,
                            'up'
                          )
                        }
                        aria-label="Good answer"
                      >
                        👍
                      </button>


                      <button
                        type="button"
                        className={`chatbot-feedback-btn ${
                          message.feedback ===
                          'down'
                            ? 'active'
                            : ''
                        }`}
                        onClick={() =>
                          handleFeedback(
                            index,
                            'down'
                          )
                        }
                        aria-label="Not helpful"
                      >
                        👎
                      </button>


                      {message.feedback && (

                        <span className="chatbot-feedback-thanks">
                          Thanks for the feedback!
                        </span>

                      )}

                    </div>

                  )}


                {/* =================================================
                    TIME
                ================================================= */}

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

            )
          )}


          {/* =================================================
              QUICK REPLIES
          ================================================= */}

          {messages.length === 1 &&
            !isLoading && (

              <div className="chatbot-quick-replies">

                {QUICK_REPLIES.map(
                  (quickReply) => (

                    <button
                      key={quickReply}
                      type="button"
                      className="chatbot-quick-reply"
                      onClick={() =>
                        sendMessage(
                          quickReply
                        )
                      }
                    >
                      {quickReply}
                    </button>

                  )
                )}

              </div>

            )}


          {/* =================================================
              TYPING
          ================================================= */}

          {isLoading && (

            <div className="chatbot-row bot">

              <div className="chatbot-bubble bot chatbot-typing">

                <span></span>
                <span></span>
                <span></span>

              </div>

            </div>

          )}


          <div
            ref={messagesEndRef}
          />

        </div>


        {/* =================================================
            INPUT
        ================================================= */}

        <div className="chatbot-input-row">

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="chatbot-input"
            disabled={isLoading}
            maxLength={500}
          />


          <button
            type="button"
            className="chatbot-send"
            onClick={() =>
              sendMessage()
            }
            disabled={
              isLoading ||
              !input.trim()
            }
            aria-label="Send message"
          >

            <svg
              width="17"
              height="17"
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


        {/* =================================================
            FOOTER
        ================================================= */}

        <p className="chatbot-footer-note">
          Brew Haven · Bru AI · usually replies in a few seconds
        </p>

      </div>

    </>
  );
};


export default Chatbot;