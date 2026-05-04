import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Tamanho em px do quadrado (default 28). */
  size?: number;
  /** Variante "filled" (selo escuro) ou "outline" (claro sobre escuro). */
  variant?: "filled" | "outline";
}

/**
 * Selo da marca Greenlion. SVG inline para nitidez em qualquer tamanho.
 * Composto por dois traços: uma folha estilizada e uma linha-base
 * representando precisão (a "Precision" do nome).
 */
export function BrandMark({ className, size = 28, variant = "filled" }: BrandMarkProps) {
  const isFilled = variant === "filled";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="7"
        fill={isFilled ? "currentColor" : "none"}
        stroke={isFilled ? "none" : "currentColor"}
        strokeWidth="1.5"
      />
      {/* Folha estilizada — caule diagonal + curvatura assimétrica */}
      <path
        d="M9.5 22 L9.5 13 C9.5 10.5 11.5 9 14 9 L19 9 C21.5 9 23 11 23 13 C23 17.5 19 22 14.5 22 Z"
        fill={isFilled ? "hsl(var(--primary-foreground))" : "currentColor"}
        opacity={isFilled ? "0.96" : "1"}
      />
      {/* Nervura central da folha */}
      <path
        d="M9.5 22 L19.5 12.5"
        stroke={isFilled ? "hsl(var(--primary))" : "hsl(var(--background))"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Lockup completo da marca: selo + wordmark.
 * Usado no login, no topo da sidebar, etc.
 */
export function BrandLockup({
  className,
  size = 28,
  variant = "filled",
  showTagline = false,
}: BrandMarkProps & { showTagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} variant={variant} />
      <div className="flex flex-col leading-none">
        <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
          Greenlion <span className="font-normal italic text-primary">Precision</span>
        </span>
        {showTagline && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Plataforma médica
          </span>
        )}
      </div>
    </div>
  );
}
