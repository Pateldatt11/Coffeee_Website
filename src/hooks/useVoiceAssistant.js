import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';

const useVoiceAssistant = ({
  onCommand,
  lang = 'en-IN',
} = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const onCommandRef = useRef(onCommand);

  onCommandRef.current = onCommand;

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const chunk =
          event.results[i][0]?.transcript || '';

        if (event.results[i].isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }

      setTranscript(
        finalText || interimText
      );

      if (finalText.trim()) {
        onCommandRef.current?.(
          finalText.trim()
        );
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error !== 'no-speech' &&
        event.error !== 'aborted'
      ) {
        console.error(
          'Voice recognition error:',
          event.error
        );
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;

      try {
        recognition.abort();
      } catch {
        // Ignore cleanup error.
      }

      recognitionRef.current = null;
    };
  }, [lang]);

  const startListening = useCallback(() => {
    const recognition =
      recognitionRef.current;

    if (!recognition || isListening) {
      return;
    }

    setTranscript('');

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.warn(
        'Could not start voice recognition:',
        error
      );

      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    const recognition =
      recognitionRef.current;

    if (!recognition) {
      return;
    }

    try {
      recognition.stop();
    } catch {
      // Already stopped.
    }

    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (
        typeof window === 'undefined' ||
        !window.speechSynthesis ||
        !text
      ) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.lang = lang;
      utterance.rate = 1;
      utterance.pitch = 1;

      window.speechSynthesis.speak(
        utterance
      );
    },
    [lang]
  );

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    speak,
  };
};

export default useVoiceAssistant;