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
  /**
   * Flag de retry — controla se já tentamos retry após erro de rede
   * nesta sessão de captura. Evita loop infinito de retries.
   */
  const networkRetriedRef = useRef(false);

  /**
   * Mensagem de erro de rede com causa provável e orientação clara.
   * Esse erro é o mais comum e o mais importante de explicar bem.
   */
  const buildNetworkErrorMessage = useCallback((): string => {
    return (
      "Não foi possível processar a captura de voz. " +
      "A captura de voz gratuita do navegador depende dos servidores de fala do Google. " +
      "Verifique sua conexão; se estiver em rede corporativa/clínica, ela pode estar bloqueando o serviço. " +
      "Tente outra rede (ex.: 4G do celular) ou digite manualmente."
    );
  }, []);

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
      onError?.("Captura de voz não suportada neste navegador. Use Google Chrome ou Microsoft Edge.");
      return;
    }

    // Para qualquer reconhecimento anterior antes de começar um novo
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
    }

    // Reset do flag de retry para esta nova sessão de captura
    networkRetriedRef.current = false;

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
      // Log detalhado no console para diagnóstico (visível em DevTools)
      console.warn("[SpeechRecognition] Erro:", {
        error: event.error,
        message: event.message,
        timestamp: new Date().toISOString(),
      });

      // Erro 'network': o reconhecimento foi até o servidor de speech do
      // Google (speech.googleapis.com) e a rede falhou. Tentamos uma
      // segunda vez automaticamente — falhas momentâneas são comuns.
      if (event.error === "network" && !networkRetriedRef.current) {
        networkRetriedRef.current = true;
        console.info("[SpeechRecognition] network error — tentando novamente em 600ms…");
        setTimeout(() => {
          try {
            rec.start();
          } catch {
            // Se nem o retry conseguir iniciar, segue pro caminho de erro
            onError?.(buildNetworkErrorMessage());
            setListening(false);
          }
        }, 600);
        return;
      }

      const msg =
        event.error === "no-speech"
          ? "Nenhuma fala detectada. Tente falar mais próximo do microfone."
          : event.error === "not-allowed"
          ? "Permissão de microfone negada. Clique no ícone de cadeado na barra de URL e permita o uso do microfone para este site."
          : event.error === "audio-capture"
          ? "Microfone não encontrado. Verifique se há um microfone conectado e selecionado nas configurações do sistema."
          : event.error === "network"
          ? buildNetworkErrorMessage()
          : event.error === "service-not-allowed"
          ? "Serviço de reconhecimento de fala não disponível neste navegador. Use Google Chrome ou Microsoft Edge."
          : event.error === "aborted"
          ? "" // silencioso — captura cancelada pelo usuário
          : `Erro na captura de voz: ${event.error}`;

      if (msg) onError?.(msg);
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
