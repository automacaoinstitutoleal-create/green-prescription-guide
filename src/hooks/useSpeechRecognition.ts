import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// useSpeechRecognition
//
// Hook que encapsula a Web Speech API (gratuita, nativa do navegador).
// Funciona em Chrome, Edge e Safari modernos. Em outros navegadores,
// retorna isSupported=false para que a UI esconda o botão de voz.
//
// Uso:
//   const { isSupported, listening, transcript, start, stop, reset } =
//     useSpeechRecognition({ language: "pt-BR" });
//
// Filosofia:
//  - Fala em tempo real é acumulada em `transcript`
//  - Cada chamada nova de start() RESETA o transcript (evita sujeira
//    de sessões anteriores)
//  - O médico pode parar a qualquer momento e o que foi capturado é
//    devolvido via callback `onResult`
// ═══════════════════════════════════════════════════════════════════

// Tipos da Web Speech API (não estão no @types/dom por padrão).
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface UseSpeechRecognitionOptions {
  /** Idioma da transcrição. Default: pt-BR. */
  language?: string;
  /** Callback chamado quando a captura termina, com o texto final. */
  onResult?: (text: string) => void;
  /** Callback de erro — útil para mostrar toast ao usuário. */
  onError?: (error: string) => void;
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}) {
  const { language = "pt-BR", onResult, onError } = opts;
  const [isSupported, setIsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Detecta suporte na montagem.
  useEffect(() => {
    const w = window as unknown as WindowWithSpeech;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRec));
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as WindowWithSpeech;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      onError?.("Captura de voz não suportada neste navegador.");
      return;
    }

    // Para qualquer reconhecimento anterior antes de começar um novo
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
    }

    const rec = new SpeechRec();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = "";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPiece = result[0].transcript;
        if (result.isFinal) {
          finalText += transcriptPiece;
        } else {
          interimText += transcriptPiece;
        }
      }
      if (finalText) setTranscript(finalText);
      setInterim(interimText);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.error === "no-speech"
        ? "Nenhuma fala detectada."
        : event.error === "not-allowed"
        ? "Permissão de microfone negada. Habilite em Configurações do navegador."
        : event.error === "audio-capture"
        ? "Microfone não encontrado."
        : event.error === "network"
        ? "Erro de rede ao processar a fala."
        : `Erro de captura: ${event.error}`;
      onError?.(msg);
      setListening(false);
    };

    rec.onstart = () => {
      setListening(true);
      setTranscript("");
      setInterim("");
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
      if (finalText.trim()) {
        onResult?.(finalText.trim());
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      onError?.("Não foi possível iniciar a captura de voz.");
      setListening(false);
    }
  }, [language, onResult, onError]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* noop */ }
      }
    };
  }, []);

  return { isSupported, listening, transcript, interim, start, stop, reset };
}
