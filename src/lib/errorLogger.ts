import { supabase } from "@/integrations/supabase/client";

type SafeValue = string | number | boolean | null | undefined;

export interface AppErrorLogInput {
  screen: string;
  operation: string;
  stage: string;
  error: unknown;
  errorType?: string;
  context?: Record<string, SafeValue>;
  doctorId?: string | null;
}

interface QueuedErrorLog {
  screen: string;
  operation: string;
  stage: string;
  error_type: string;
  error_message: string;
  technical_context: Record<string, string | number | boolean | null>;
  page_url: string;
  user_agent: string;
  occurred_at: string;
}

const QUEUE_KEY = "precision_pending_error_logs";
const MAX_QUEUE_SIZE = 20;
const BLOCKED_CONTEXT_KEYS = /name|email|cpf|rg|address|phone|password|token|secret|clinical|anamnese|answer|patient/i;

const truncate = (value: string, max = 500) => value.slice(0, max);

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { message: truncate(error.message || error.name), type: truncate(error.name || "Error", 80) };
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; code?: unknown; name?: unknown };
    const message = typeof candidate.message === "string" ? candidate.message : "Falha técnica sem mensagem";
    const type = typeof candidate.code === "string"
      ? candidate.code
      : typeof candidate.name === "string" ? candidate.name : "application_error";
    return { message: truncate(message), type: truncate(type, 80) };
  }
  return { message: truncate(String(error || "Falha técnica sem mensagem")), type: "application_error" };
}

function safeContext(context?: Record<string, SafeValue>) {
  if (!context) return {};
  return Object.fromEntries(
    Object.entries(context)
      .filter(([key, value]) => !BLOCKED_CONTEXT_KEYS.test(key) && ["string", "number", "boolean"].includes(typeof value) || value === null)
      .slice(0, 20)
      .map(([key, value]) => [truncate(key, 80), typeof value === "string" ? truncate(value, 200) : value ?? null]),
  );
}

function browserContext() {
  if (typeof window === "undefined") return { page_url: "", user_agent: "" };
  return {
    page_url: truncate(`${window.location.origin}${window.location.pathname}`, 500),
    user_agent: truncate(window.navigator.userAgent, 500),
  };
}

function readQueue(): QueuedErrorLog[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE_SIZE) : [];
  } catch {
    return [];
  }
}

function queueLog(log: QueuedErrorLog) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...readQueue(), log].slice(-MAX_QUEUE_SIZE)));
  } catch {
    // O registro de falha nunca deve interromper a operação principal.
  }
}

export async function reportAppError(input: AppErrorLogInput): Promise<void> {
  try {
    const details = errorDetails(input.error);
    const log: QueuedErrorLog = {
      screen: truncate(input.screen, 100),
      operation: truncate(input.operation, 120),
      stage: truncate(input.stage, 120),
      error_type: truncate(input.errorType || details.type, 80),
      error_message: details.message,
      technical_context: safeContext(input.context),
      ...browserContext(),
      occurred_at: new Date().toISOString(),
    };

    if (!input.doctorId) {
      queueLog(log);
      return;
    }

    const { error } = await supabase.from("app_error_logs").insert({ doctor_id: input.doctorId, ...log });
    if (error) queueLog(log);
  } catch {
    // Telemetria deve ser silenciosa e nunca bloquear o médico.
  }
}

export async function flushQueuedErrorLogs(doctorId: string): Promise<void> {
  const queued = readQueue();
  if (!queued.length) return;
  try {
    const { error } = await supabase
      .from("app_error_logs")
      .insert(queued.map((log) => ({ doctor_id: doctorId, ...log })));
    if (!error) localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Mantém a fila local para a próxima sessão.
  }
}