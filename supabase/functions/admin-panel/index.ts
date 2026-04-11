import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, password, filters, targetId, targetType } = await req.json();

    const adminPassword = Deno.env.get("ADMIN_PANEL_PASSWORD");
    if (!adminPassword || password !== adminPassword) {
      return new Response(JSON.stringify({ error: "Senha inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "getData") {
      // Fetch all doctors
      const { data: doctors } = await supabaseAdmin
        .from("doctor_profiles")
        .select("*");

      // Fetch all patients
      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("*");

      // Fetch prescriptions with optional date filter
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
        // Delete doctor's prescriptions, annotations, patients, then profile
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
          // Delete auth user
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
