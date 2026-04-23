import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In-memory rate limiter (per-instance). Tracks failed password attempts per IP.
const FAILED_ATTEMPTS = new Map<string, { count: number; firstAt: number; blockedUntil: number }>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_FAILS = 5;
const BLOCK_MS = 5 * 60_000; // 5 minutes block after exceeding

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = FAILED_ATTEMPTS.get(ip);
  if (!entry) return { allowed: true };
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  if (now - entry.firstAt > WINDOW_MS) {
    FAILED_ATTEMPTS.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailure(ip: string) {
  const now = Date.now();
  const entry = FAILED_ATTEMPTS.get(ip);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    FAILED_ATTEMPTS.set(ip, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= MAX_FAILS) {
    entry.blockedUntil = now + BLOCK_MS;
  }
  FAILED_ATTEMPTS.set(ip, entry);
}

function recordSuccess(ip: string) {
  FAILED_ATTEMPTS.delete(ip);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIp(req);

  try {
    // Rate-limit check before processing password (no user auth required - password is the only gate)
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Tente novamente mais tarde." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rl.retryAfter ?? 300),
          },
        }
      );
    }

    const { action, password, filters, targetId, targetType } = await req.json();

    const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
    if (!adminPassword || password !== adminPassword) {
      recordFailure(ip);
      console.warn("admin-panel: failed auth attempt", { ip });
      return new Response(JSON.stringify({ error: "Senha inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    recordSuccess(ip);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "getData") {
      const { data: doctors } = await supabaseAdmin
        .from("doctor_profiles")
        .select("*");

      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("*");

      let prescriptionsQuery = supabaseAdmin
        .from("prescriptions")
        .select("*");

      if (filters?.dateFrom) {
        prescriptionsQuery = prescriptionsQuery.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        prescriptionsQuery = prescriptionsQuery.lte("created_at", filters.dateTo + "T23:59:59");
      }

      const { data: prescriptions } = await prescriptionsQuery;

      return new Response(
        JSON.stringify({ doctors, patients, prescriptions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (targetType === "doctor") {
        const { data: doc } = await supabaseAdmin
          .from("doctor_profiles")
          .select("user_id")
          .eq("id", targetId)
          .single();

        if (doc) {
          await supabaseAdmin.from("prescriptions").delete().eq("doctor_id", doc.user_id);
          await supabaseAdmin.from("annotations").delete().eq("doctor_id", doc.user_id);
          await supabaseAdmin.from("patients").delete().eq("doctor_id", doc.user_id);
          await supabaseAdmin.from("doctor_profiles").delete().eq("id", targetId);
          await supabaseAdmin.auth.admin.deleteUser(doc.user_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetType === "patient") {
        await supabaseAdmin.from("prescriptions").delete().eq("patient_id", targetId);
        await supabaseAdmin.from("annotations").delete().eq("patient_id", targetId);
        await supabaseAdmin.from("patients").delete().eq("id", targetId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-panel error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
