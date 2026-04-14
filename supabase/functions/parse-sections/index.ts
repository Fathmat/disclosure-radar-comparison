import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Canonical SEC filing sections
const SECTION_PATTERNS: [string, RegExp][] = [
  ["Risk Factors", /(?:item\s*1a[\.\s\-:]*risk\s*factors)/i],
  ["MD&A", /(?:item\s*7[\.\s\-:]*management.s?\s*discussion)/i],
  ["Quantitative Disclosures", /(?:item\s*7a[\.\s\-:]*quantitative)/i],
  ["Financial Statements", /(?:item\s*8[\.\s\-:]*financial\s*statements)/i],
  ["Legal Proceedings", /(?:item\s*3[\.\s\-:]*legal\s*proceedings)/i],
  ["Business", /(?:item\s*1[\.\s\-:]*business(?!\s*combination))/i],
  ["Properties", /(?:item\s*2[\.\s\-:]*properties)/i],
  ["Unresolved Comments", /(?:item\s*1b[\.\s\-:]*unresolved)/i],
  ["Controls and Procedures", /(?:item\s*9a[\.\s\-:]*controls)/i],
  ["Executive Compensation", /(?:item\s*11[\.\s\-:]*executive\s*compensation)/i],
  ["Liquidity", /(?:liquidity\s*and\s*capital\s*resources)/i],
  ["Revenue Recognition", /(?:revenue\s*recognition)/i],
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filing_id } = await req.json();
    if (!filing_id) {
      return new Response(JSON.stringify({ error: "filing_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: filing, error } = await supabase
      .from("filings")
      .select("id, raw_text, parsed_sections")
      .eq("id", filing_id)
      .maybeSingle();

    if (error || !filing) {
      return new Response(JSON.stringify({ error: "Filing not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already parsed
    if (filing.parsed_sections && Object.keys(filing.parsed_sections as object).length > 0) {
      return new Response(JSON.stringify({ parsed: true, sections: Object.keys(filing.parsed_sections as object) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = filing.raw_text;
    const sections: Record<string, string> = {};

    // Find section boundaries
    const matches: { name: string; index: number }[] = [];
    for (const [name, pattern] of SECTION_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        matches.push({ name, index: match.index });
      }
    }

    // Sort by position in document
    matches.sort((a, b) => a.index - b.index);

    // Extract text between section boundaries
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : Math.min(start + 15000, text.length);
      const sectionText = text.substring(start, end).trim();
      // Limit each section to 8000 chars for AI processing
      sections[matches[i].name] = sectionText.substring(0, 8000);
    }

    // If no sections found, create a single "Full Document" section
    if (Object.keys(sections).length === 0) {
      sections["Full Document"] = text.substring(0, 8000);
    }

    // Store parsed sections
    await supabase
      .from("filings")
      .update({ parsed_sections: sections, parse_version: "v0.1-regex" })
      .eq("id", filing_id);

    return new Response(JSON.stringify({
      parsed: true,
      sections: Object.keys(sections),
      section_count: Object.keys(sections).length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("parse-sections error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
