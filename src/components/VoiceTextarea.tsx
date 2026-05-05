import { useEffect, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceTextareaProps extends React.ComponentProps<typeof Textarea> {
  /**
   * Quando true, exibe o botão de captura de voz.
   * O botão fica oculto se o navegador não suportar Web Speech API.
   */
  voiceCapture?: boolean;
  /** Modo de captura: "append" adiciona ao texto existente, "replace" substitui. */
  voiceMode?: "append" | "replace";
}

/**
 * Textarea com botão de microfone (canto inferior direito) que ativa a
 * captura de voz nativa do navegador. O texto reconhecido é adicionado
 * ao conteúdo do campo, permitindo que o médico capte a fala do paciente
 * durante a consulta sem digitar.
 */
export function VoiceTextarea({
  voiceCapture = true,
  voiceMode = "append",
  value,
  onChange,
  className,
  ...rest
}: VoiceTextareaProps) {
  const [showInterim, setShowInterim] = useState(false);

  const handleVoiceResult = (text: string) => {
    if (!onChange) return;
    const currentValue = String(value ?? "");
    const newValue = voiceMode === "replace"
      ? text
      : (currentValue.trim() ? currentValue.trim() + " " + text : text);
    // Sintetiza um evento de mudança para reusar a API padrão do Textarea
    const fakeEvent = {
      target: { value: newValue },
      currentTarget: { value: newValue },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(fakeEvent);
  };

  const { isSupported, listening, interim, start, stop } = useSpeechRecognition({
    language: "pt-BR",
    onResult: handleVoiceResult,
    onError: (msg) => toast.error(msg),
  });

  // Mostra o texto provisório (interim) "fantasma" enquanto fala
  useEffect(() => {
    setShowInterim(listening && Boolean(interim));
  }, [listening, interim]);

  const showButton = voiceCapture && isSupported;

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={onChange}
        className={cn(showButton ? "pr-12" : "", className)}
        {...rest}
      />
      {showInterim && (
        <p className="mt-1 px-3 text-[11px] italic text-ink-soft">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />{" "}
          Ouvindo: <span className="text-foreground/80">{interim}</span>
        </p>
      )}
      {showButton && (
        <button
          type="button"
          onClick={() => (listening ? stop() : start())}
          aria-label={listening ? "Parar captura de voz" : "Iniciar captura de voz"}
          title={listening ? "Parar captura" : "Ditar / capturar fala do paciente"}
          className={cn(
            "absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border transition-all",
            listening
              ? "border-destructive/40 bg-destructive/10 text-destructive shadow-[0_0_0_3px_hsl(var(--destructive)/0.15)]"
              : "border-border bg-surface text-ink-soft hover:border-primary/40 hover:text-primary"
          )}
        >
          {listening ? (
            <>
              <MicOff className="h-3.5 w-3.5" />
              <span className="sr-only">Parar</span>
            </>
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
