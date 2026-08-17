import React, {
  useState,
  useRef,
  useEffect,
} from 'react';

import './Chatbot.css';


// =====================================================
// API
// =====================================================

const CHATBOT_URL = '/api/chat';

const FEEDBACK_STORAGE_KEY =
  'brewhaven_chat_feedback';


// =====================================================
// QUICK QUESTIONS
// =====================================================

const QUICK_REPLIES = [
  'Show me the menu & prices',
  'What time do you close?',
  "What's your best seller?",
  'Do you deliver?',
  'What is the delivery time?',
  'Recommend a strong coffee',
];


// =====================================================
// FEEDBACK STORAGE
// =====================================================

function saveFeedback(entry) {
  try {

    const existing = JSON.parse(
      localStorage.getItem(
        FEEDBACK_STORAGE_KEY
      ) || '[]'
    );


    existing.push({
      ...entry,
      savedAt: new Date().toISOString(),
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
// TIME
// =====================================================

function getTime() {

  return new Date().toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}


// =====================================================
// CHATBOT
// =====================================================

const Chatbot = () => {

  const [isOpen, setIsOpen] =
    useState(false);


  const [hasNewMessage, setHasNewMessage] =
    useState(true);


  const [messages, setMessages] =
    useState([
      {
        role: 'bot',
        text:
          "Hey there! 👋 I'm Bru, your Brew Haven barista. Ask me anything about our menu, prices, hours, delivery, or tell me what kind of coffee you're in the mood for.",
        time: getTime(),
        feedback: null,
      },
    ]);


  const [input, setInput] =
    useState('');


  const [isLoading, setIsLoading] =
    useState(false);


  const messagesEndRef =
    useRef(null);


  const inputRef =
    useRef(null);


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
  // OPEN FOCUS
  // ===================================================

  useEffect(() => {

    if (!isOpen) {
      return;
    }


    setHasNewMessage(false);


    const timeout =
      setTimeout(() => {

        inputRef.current?.focus();

      }, 250);


    return () => {
      clearTimeout(timeout);
    };

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


    if (
      !trimmed ||
      isLoading
    ) {
      return;
    }


    // =================================================
    // SAVE USER MESSAGE
    // =================================================

    const userMessage = {
      role: 'user',
      text: trimmed,
      time: getTime(),
    };


    setMessages(
      (previousMessages) => [
        ...previousMessages,
        userMessage,
      ]
    );


    setInput('');
    setIsLoading(true);


    try {

      // ===============================================
      // HISTORY
      // ===============================================

      const recentHistory =
        messages
          .slice(-8)
          .map(
            ({
              role,
              text,
            }) => ({
              role,
              text,
            })
          );


      // ===============================================
      // API REQUEST
      // ===============================================

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
              history: recentHistory,
            }),
          }
        );


      // ===============================================
      // READ RESPONSE
      // ===============================================

      let data = null;


      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          'The chatbot server returned an invalid response.'
        );
      }


      // ===============================================
      // SERVER ERROR
      // ===============================================

      if (!response.ok) {

        const serverError =
          data?.error ||
          'The chatbot server returned an error.';


        const error =
          new Error(serverError);


        error.status =
          response.status;


        error.code =
          data?.code;


        throw error;
      }


      // ===============================================
      // RESPONSE
      // ===============================================

      const reply =
        typeof data?.reply === 'string'
          ? data.reply.trim()
          : 'Sorry, I could not generate a response.';


      // ===============================================
      // BOT MESSAGE
      // ===============================================

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            role: 'bot',
            text: reply,
            time: getTime(),
            userQuestion: trimmed,
            feedback: null,
            source: data?.source,
            model: data?.model,
          },
        ]
      );


      if (!isOpen) {
        setHasNewMessage(true);
      }


    } catch (error) {

      console.error(
        '[BREW HAVEN CHATBOT]',
        error
      );


      // =============================================
      // DEFAULT
      // =============================================

      let errorMessage =
        'I’m having trouble connecting right now. ' +
        'Please try again in a moment.';


      const status =
        error?.status;


      const code =
        error?.code;


      const errorText =
        error?.message?.toLowerCase() ||
        '';


      // =============================================
      // API KEY
      // =============================================

      if (
        code === 'MISSING_API_KEY' ||
        errorText.includes(
          'api key is not configured'
        )
      ) {

        errorMessage =
          'The chatbot API key is not configured correctly on Vercel.';

      }


      // =============================================
      // AUTH
      // =============================================

      else if (
        status === 401 ||
        errorText.includes(
          'authentication'
        )
      ) {

        errorMessage =
          'The AI service authentication is invalid. Please check the Groq API key.';

      }


      // =============================================
      // FORBIDDEN
      // =============================================

      else if (
        status === 403 ||
        errorText.includes(
          'access was denied'
        )
      ) {

        errorMessage =
          'The AI service access was denied. Please check the API key permissions.';

      }


      // =============================================
      // RATE LIMIT
      // =============================================

      else if (
        status === 429 ||
        errorText.includes(
          'temporarily busy'
        )
      ) {

        errorMessage =
          'The AI service is busy right now. Please try again in a few seconds.';

      }


      // =============================================
      // BAD REQUEST
      // =============================================

      else if (
        status === 400
      ) {

        errorMessage =
          'I couldn’t process that request. Try asking it in a slightly different way.';

      }


      // =============================================
      // NETWORK
      // =============================================

      else if (
        errorText.includes(
          'failed to fetch'
        ) ||
        errorText.includes(
          'network'
        )
      ) {

        errorMessage =
          'Unable to connect to the chatbot server. Please check your internet connection and try again.';

      }


      // =============================================
      // FALLBACK
      // =============================================

      else if (
        errorText.includes(
          'temporarily unavailable'
        )
      ) {

        errorMessage =
          'The AI service is temporarily busy. Please try again in a moment.';

      }


      // =============================================
      // SHOW ERROR
      // =============================================

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
        target?.text ||
        null,

      rating: value,
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
  // TOGGLE
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
          FLOATING BUTTON
      ================================================= */}

      <button
        type="button"
        className={
          `chatbot-toggle ${
            isOpen ? 'open' : ''
          }`
        }
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
            <span
              className="chatbot-toggle-dot"
            />
          )}

      </button>


      {/* =================================================
          CHAT WINDOW
      ================================================= */}

      <div
        className={
          `chatbot-window ${
            isOpen ? 'open' : ''
          }`
        }
        role="dialog"
        aria-label="Brew Haven chat"
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

              <span
                className="chatbot-status-dot"
              />

              Bru is online

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
            (message, index) => (

              <div
                key={`${message.role}-${index}`}
                className={
                  `chatbot-row ${
                    message.role
                  }`
                }
              >

                <div
                  className={
                    `chatbot-bubble ${
                      message.role
                    } ${
                      message.isError
                        ? 'error'
                        : ''
                    }`
                  }
                >

                  {message.text}

                </div>


                {/* ========================================
                    FEEDBACK
                ======================================== */}

                {message.role === 'bot' &&
                  !message.isError &&
                  index !== 0 && (

                    <div
                      className="chatbot-feedback"
                    >

                      <button
                        type="button"
                        className={
                          `chatbot-feedback-btn ${
                            message.feedback ===
                            'up'
                              ? 'active'
                              : ''
                          }`
                        }
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
                        className={
                          `chatbot-feedback-btn ${
                            message.feedback ===
                            'down'
                              ? 'active'
                              : ''
                          }`
                        }
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

                        <span
                          className="chatbot-feedback-thanks"
                        >
                          Thanks for the feedback!
                        </span>

                      )}

                    </div>
                  )}


                {/* ========================================
                    TIME
                ======================================== */}

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

              <div
                className="chatbot-quick-replies"
              >

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

            <div
              className="chatbot-row bot"
            >

              <div
                className="chatbot-bubble bot chatbot-typing"
              >

                <span />
                <span />
                <span />

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
            placeholder="Ask me anything..."
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


        <p
          className="chatbot-footer-note"
        >
          Brew Haven · Bru usually replies in a few seconds
        </p>

      </div>
    </>
  );
};


export default Chatbot;