import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const issuer = url.searchParams.get("issuer");
    const filingType = url.searchParams.get("filing_type");
    const section = url.searchParams.get("section");
    const changeType = url.searchParams.get("change_type");
    const minConfidence = url.searchParams.get("min_confidence");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase.from("change_events").select("*");

    if (issuer) query = query.eq("issuer", issuer);
    if (filingType) query = query.eq("filing_type", filingType);
    if (section) query = query.eq("section", section);
    if (changeType) query = query.eq("change_type", changeType);
    if (minConfidence) query = query.gte("confidence", parseFloat(minConfidence));

    query = query.order("extraction_timestamp", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("events-api error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
