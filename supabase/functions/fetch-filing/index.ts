import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cik, filing_type } = await req.json();
    if (!cik || !filing_type) {
      return new Response(JSON.stringify({ error: "cik and filing_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if we already have 2+ filings cached
    const { data: existing } = await supabase
      .from("filings")
      .select("id, filing_date")
      .eq("cik", cik)
      .eq("filing_type", filing_type)
      .order("filing_date", { ascending: false })
      .limit(2);

    if (existing && existing.length >= 2) {
      return new Response(JSON.stringify({
        current_filing_id: existing[0].id,
        previous_filing_id: existing[1].id,
        cached: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch from SEC EDGAR EFTS API
    const cleanCik = cik.replace(/^0+/, "");
    const formType = encodeURIComponent(filing_type);
    
    const edgarUrl = `https://efts.sec.gov/LATEST/search-index?q=%22${formType}%22&dateRange=custom&startdt=2023-01-01&enddt=2026-12-31&forms=${formType}&entityName=${cleanCik}`;
    
    // Use the EDGAR company filings API instead
    const filingsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    
    const edgarResp = await fetch(filingsUrl, {
      headers: {
        "User-Agent": "DisclosureChangeRadar/1.0 research@example.com",
        "Accept": "application/json",
      },
    });

    if (!edgarResp.ok) {
      throw new Error(`EDGAR API returned ${edgarResp.status}`);
    }

    const edgarData = await edgarResp.json();
    const recentFilings = edgarData.filings?.recent;
    if (!recentFilings) throw new Error("No filings data from EDGAR");

    // Find matching filing type entries
    const indices: number[] = [];
    for (let i = 0; i < recentFilings.form.length && indices.length < 2; i++) {
      if (recentFilings.form[i] === filing_type) {
        indices.push(i);
      }
    }

    if (indices.length < 2) {
      return new Response(JSON.stringify({ 
        error: `Found only ${indices.length} ${filing_type} filing(s) for this company. Need at least 2.` 
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const filingIds: string[] = [];

    for (const idx of indices) {
      const accessionRaw = recentFilings.accessionNumber[idx];
      const accession = accessionRaw.replace(/-/g, "");
      const filingDate = recentFilings.filingDate[idx];
      const primaryDoc = recentFilings.primaryDocument[idx];
      
      // Check if already stored
      const { data: existingFiling } = await supabase
        .from("filings")
        .select("id")
        .eq("accession_number", accessionRaw)
        .maybeSingle();

      if (existingFiling) {
        filingIds.push(existingFiling.id);
        continue;
      }

      // Fetch the actual filing document
      const docUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accession}/${primaryDoc}`;
      const docResp = await fetch(docUrl, {
        headers: { "User-Agent": "DisclosureChangeRadar/1.0 research@example.com" },
      });

      if (!docResp.ok) {
        console.error(`Failed to fetch document: ${docUrl} (${docResp.status})`);
        continue;
      }

      let rawText = await docResp.text();
      // Strip HTML tags for cleaner text
      rawText = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      // Limit to first 100k chars to stay within DB limits
      rawText = rawText.substring(0, 100000);

      const { data: inserted, error: insertErr } = await supabase
        .from("filings")
        .insert({
          cik,
          filing_type,
          filing_date: filingDate,
          accession_number: accessionRaw,
          primary_document: primaryDoc,
          raw_text: rawText,
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
      filingIds.push(inserted.id);
    }

    if (filingIds.length < 2) {
      return new Response(JSON.stringify({ error: "Could not fetch 2 filings" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      current_filing_id: filingIds[0],
      previous_filing_id: filingIds[1],
      cached: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("fetch-filing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
