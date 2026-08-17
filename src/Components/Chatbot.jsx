import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const CHATBOT_URL = "/api/chat";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hey! Welcome to Brew Haven ☕ How can I help you?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      role: "user",
      text,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // --------------------------------------------------------
      // SEND ONLY RECENT HISTORY
      // --------------------------------------------------------

      const history = updatedMessages
        .slice(-8)
        .map((message) => ({
          role: message.role,
          text: message.text,
        }));

      // --------------------------------------------------------
      // API REQUEST
      // --------------------------------------------------------

      const response = await fetch(CHATBOT_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      // --------------------------------------------------------
      // READ RESPONSE
      // --------------------------------------------------------

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      console.log(
        "[BREW HAVEN CHATBOT] API response:",
        data
      );

      // --------------------------------------------------------
      // API ERROR
      // --------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "The chatbot service is temporarily unavailable."
        );
      }

      // --------------------------------------------------------
      // BOT RESPONSE
      // --------------------------------------------------------

      const reply =
        typeof data?.reply === "string"
          ? data.reply.trim()
          : "";

      if (!reply) {
        throw new Error(
          "The chatbot returned an empty response."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "bot",
          text: reply,
        },
      ]);
    } catch (error) {
      console.error(
        "[BREW HAVEN CHATBOT] Error:",
        error
      );

      setMessages((previous) => [
        ...previous,
        {
          role: "bot",
          text:
            "I'm having trouble connecting right now. Please try again in a moment.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // ============================================================
  // CLEAR CHAT
  // ============================================================

  const clearChat = () => {
    setMessages([
      {
        role: "bot",
        text: "Hey! Welcome to Brew Haven ☕ How can I help you?",
      },
    ]);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* ======================================================
          FLOATING CHAT BUTTON
      ====================================================== */}

      {!isOpen && (
        <button
          className="chatbot-floating-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Brew Haven chatbot"
        >
          ☕
        </button>
      )}

      {/* ======================================================
          CHAT WINDOW
      ====================================================== */}

      {isOpen && (
        <div className="chatbot-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="chatbot-header">

            <div className="chatbot-header-left">

              <div className="chatbot-avatar">
                ☕
              </div>

              <div>
                <div className="chatbot-title">
                  Bru
                </div>

                <div className="chatbot-status">
                  Brew Haven Barista
                </div>
              </div>

            </div>

            <div className="chatbot-header-actions">

              <button
                className="chatbot-header-button"
                onClick={clearChat}
                title="Clear chat"
              >
                ↻
              </button>

              <button
                className="chatbot-header-button"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ×
              </button>

            </div>

          </div>

          {/* ==================================================
              MESSAGES
          ================================================== */}

          <div className="chatbot-messages">

            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "chatbot-message user-message"
                    : "chatbot-message bot-message"
                }
              >
                <div className="chatbot-message-bubble">
                  {message.text}
                </div>
              </div>
            ))}

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (
              <div className="chatbot-message bot-message">

                <div className="chatbot-message-bubble chatbot-typing">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* ==================================================
              INPUT
          ================================================== */}

          <div className="chatbot-input-area">

            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask about coffee, menu, hours..."
              disabled={loading}
              maxLength={500}
            />

            <button
              onClick={sendMessage}
              disabled={
                loading ||
                !input.trim()
              }
              aria-label="Send message"
            >
              ➤
            </button>

          </div>

        </div>
      )}
    </>
  );
}