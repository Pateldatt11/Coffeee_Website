import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useVoiceAssistant from '../hooks/useVoiceAssistant';
import "./VoiceAssistant.css";  

const VoiceAssistant = ({ onCommand, hints = [] }) => {
  const [showHints, setShowHints] = useState(false);
  const [feedback, setFeedback] = useState('');

  const {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  } = useVoiceAssistant({
    onCommand: (text) => {
      const result = onCommand?.(text);

      if (result) {
        setFeedback(result);

        window.setTimeout(() => {
          setFeedback('');
        }, 3500);
      }
    },
  });

  useEffect(() => {
    if (isListening) {
      setShowHints(false);
    }
  }, [isListening]);

  if (!isSupported) {
    return null;
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setFeedback('');
      startListening();
    }
  };

  const voiceUI = (
    <div className="voice-assistant">
      {/* =====================================================
          FEEDBACK / LISTENING BUBBLE
          ===================================================== */}
      {(isListening || transcript || feedback) && (
        <div className="voice-bubble">
          {isListening && (
            <div className="voice-status">
              Listening...
            </div>
          )}

          {transcript && (
            <div className="voice-transcript">
              "{transcript}"
            </div>
          )}

          {feedback && !isListening && (
            <div className="voice-feedback">
              {feedback}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          COMMAND HINTS
          ===================================================== */}
      {showHints && !isListening && hints.length > 0 && (
        <div className="voice-hints">
          <div className="voice-hints-title">
            Try saying
          </div>

          <ul>
            {hints.map((hint, index) => (
              <li key={`${hint}-${index}`}>
                “{hint}”
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* =====================================================
          BUTTONS
          ===================================================== */}
      <div className="voice-btn-row">

        <button
          type="button"
          className={`voice-fab ${isListening ? 'listening' : ''}`}
          onClick={handleMicClick}
          aria-label={
            isListening
              ? 'Stop voice assistant'
              : 'Start voice assistant'
          }
          title={
            isListening
              ? 'Stop listening'
              : 'Start voice assistant'
          }
        >
          {isListening && (
            <span className="voice-pulse-ring" />
          )}

          <span className="voice-mic-icon">
            {isListening ? '⏹' : '🎙️'}
          </span>
        </button>

        <button
          type="button"
          className="voice-hint-btn"
          onClick={() => setShowHints((prev) => !prev)}
          aria-label="Show voice commands"
          title="Voice commands"
        >
          ?
        </button>

      </div>
    </div>
  );

  /*
   * IMPORTANT:
   * Render directly inside body.
   * This prevents parent transform / overflow / z-index
   * from changing the fixed position.
   */
  return createPortal(voiceUI, document.body);
};

export default VoiceAssistant;