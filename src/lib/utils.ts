import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string as LOCAL time (avoids UTC-shift bug).
 * For YYYY-MM-DD strings, `new Date(s)` treats them as UTC midnight,
 * which shows the previous day in BRT (UTC-3). Appending T00:00:00
 * forces local-time parsing.
 */
export function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a date-only string (YYYY-MM-DD) as dd/mm/aaaa without timezone shift. */
export function formatDateBR(s: string | null | undefined): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = parseLocalDate(s);
  return d ? d.toLocaleDateString("pt-BR") : "";
}
