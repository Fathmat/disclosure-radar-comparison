import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function findSpanInText(span: string, fullText: string): { verified: boolean; offset: number | null; context: string | null } {
  if (!span || !fullText) return { verified: false, offset: null, context: null };

  const lowerFull = fullText.toLowerCase();
  const lowerSpan = span.toLowerCase();
  let idx = lowerFull.indexOf(lowerSpan);

  if (idx === -1) {
    const normFull = normalizeWhitespace(fullText);
    const normSpan = normalizeWhitespace(span);
    const normIdx = normFull.indexOf(normSpan);
    if (normIdx !== -1) {
      idx = normIdx;
    }
  }

  if (idx === -1) return { verified: false, offset: null, context: null };

  const contextStart = Math.max(0, idx - 250);
  const contextEnd = Math.min(fullText.length, idx + span.length + 250);
  const context = fullText.substring(contextStart, contextEnd);

  return { verified: true, offset: idx, context };
}

const MODEL_VERSION = "v0.2";

const ECONOMIC_TAXONOMY = [
  "risk_new_category_added",
  "risk_intensity_increased",
  "liquidity_warning_added",
  "litigation_exposure_added",
  "revenue_dependency_change",
  "segment_reporting_change",
  "guidance_language_weakened",
  "macro_exposure_increased",
  "supply_chain_risk_added",
  "credit_risk_language_added",
  "structural_noise",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { current_filing_id, previous_filing_id, ticker } = await req.json();
    if (!current_filing_id || !previous_filing_id || !ticker) {
      return new Response(JSON.stringify({ error: "current_filing_id, previous_filing_id, and ticker required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const [{ data: current }, { data: previous }] = await Promise.all([
      supabase.from("filings").select("*").eq("id", current_filing_id).maybeSingle(),
      supabase.from("filings").select("*").eq("id", previous_filing_id).maybeSingle(),
    ]);

    if (!current || !previous) throw new Error("One or both filings not found");

    const currentSections = (current.parsed_sections || {}) as Record<string, string>;
    const previousSections = (previous.parsed_sections || {}) as Record<string, string>;

    const { data: run, error: runErr } = await supabase
      .from("extraction_runs")
      .insert({
        current_filing_id,
        previous_filing_id,
        model_version: MODEL_VERSION,
        status: "running",
      })
      .select("id")
      .single();

    if (runErr) throw new Error(`Run creation failed: ${runErr.message}`);
    const runId = run.id;

    const allSectionNames = new Set([...Object.keys(currentSections), ...Object.keys(previousSections)]);
    const alignedSections: string[] = [];
    
    for (const name of allSectionNames) {
      if (currentSections[name] && previousSections[name]) {
        alignedSections.push(name);
      }
    }

    const allEvents: any[] = [];

    for (const sectionName of alignedSections) {
      const currentText = currentSections[sectionName].substring(0, 4000);
      const previousText = previousSections[sectionName].substring(0, 4000);

      const systemPrompt = `You are a structured material disclosure intelligence engine for SEC filings. You analyze two versions of the same filing section and extract economically meaningful changes as structured events.

NOISE FILTERING RULES (CRITICAL):
Before classifying any change, determine if it is STRUCTURAL or SEMANTIC:
- STRUCTURAL changes (mark as change_category="structural", event_type="structural_noise"):
  • Pagination changes (page numbers, headers/footers shifting)
  • Index or table-of-contents renumbering
  • Pure formatting changes (bold, italic, font size, spacing)
  • Table layout changes without content changes
  • Whitespace or punctuation-only differences
  • Boilerplate legal disclaimers unchanged in meaning
  • Section reordering without content changes
- SEMANTIC changes (mark as change_category="semantic"):
  • Genuine text additions, deletions, or modifications with economic meaning
  • Only semantic changes proceed to materiality scoring

MATERIALITY SCORING (for semantic changes only):
Assign materiality_level based on economic significance:
- "trivial": Minor wording changes with no economic impact (synonym swaps, grammar fixes)
- "moderate": Noticeable changes but limited economic significance
- "material": Significant changes affecting risk assessment, financial outlook, or legal exposure
- "critical": Major new risks, litigation disclosures, liquidity warnings, or covenant breaches

INTENSITY SCORING:
Assign intensity_delta from -5.0 to +5.0:
- +5 = Major risk intensification (new critical risk, "may" → "will", uncertainty markers added)
- +3 = Significant risk increase
- +1 = Minor risk increase
- 0 = Neutral wording change
- -1 = Minor risk softening
- -3 = Significant risk decrease
- -5 = Major risk removal or softening

Base scoring on: modal verb shifts, conditional phrases, uncertainty markers, negative sentiment clusters, quantitative threshold changes.

ECONOMIC TAXONOMY (use ONLY these event_type tags):
- risk_new_category_added: Entirely new risk factor or category introduced
- risk_intensity_increased: Existing risk language strengthened
- liquidity_warning_added: New or intensified liquidity/cash flow concerns
- litigation_exposure_added: New litigation, legal proceedings, or regulatory actions
- revenue_dependency_change: Changes in revenue concentration, customer dependency
- segment_reporting_change: Changes in business segment reporting or structure
- guidance_language_weakened: Forward-looking guidance softened or made more uncertain
- macro_exposure_increased: New macroeconomic, geopolitical, or market risk exposure
- supply_chain_risk_added: New supply chain, sourcing, or manufacturing risks
- credit_risk_language_added: New credit risk, debt covenant, or borrowing concerns
- structural_noise: For structural/formatting changes only

RULES:
- Output ONLY structured change events via tool calling
- No narrative summaries or trade recommendations
- Each event must have exact source citations from the text
- Confidence scores between 0.0 and 1.0 reflecting extraction certainty
- All outputs must be reproducible and reference exact source spans`;

      const userPrompt = `Compare these two versions of the "${sectionName}" section from ${ticker}'s ${current.filing_type} filing.

CURRENT FILING (${current.filing_date}):
${currentText}

PREVIOUS FILING (${previous.filing_date}):
${previousText}

Extract all changes as structured events. Classify each as structural or semantic. For semantic changes, score materiality and intensity.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "report_change_events",
                  description: "Report structured change events detected between two filing sections",
                  parameters: {
                    type: "object",
                    properties: {
                      events: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            event_type: {
                              type: "string",
                              enum: ECONOMIC_TAXONOMY as unknown as string[],
                              description: "Economic taxonomy tag from the controlled vocabulary",
                            },
                            change_type: { type: "string", enum: ["addition", "deletion", "modification"] },
                            change_category: {
                              type: "string",
                              enum: ["structural", "semantic"],
                              description: "Whether this is a structural (noise) or semantic (meaningful) change",
                            },
                            materiality_level: {
                              type: "string",
                              enum: ["trivial", "moderate", "material", "critical"],
                              description: "Economic materiality level (only meaningful for semantic changes)",
                            },
                            intensity_delta: {
                              type: "number",
                              minimum: -5,
                              maximum: 5,
                              description: "Risk intensity change score from -5 (softened) to +5 (intensified)",
                            },
                            description: { type: "string", description: "Brief factual description of the change" },
                            source_span_current: { type: "string", description: "Exact quoted text from current filing" },
                            source_span_previous: { type: "string", description: "Exact quoted text from previous filing" },
                            confidence: { type: "number", minimum: 0, maximum: 1 },
                          },
                          required: ["event_type", "change_type", "change_category", "materiality_level", "intensity_delta", "description", "confidence"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["events"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "report_change_events" } },
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${sectionName}:`, aiResponse.status, errText);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          console.warn(`No tool call for section ${sectionName}`);
          continue;
        }

        const parsed = JSON.parse(toolCall.function.arguments);
        const sectionEvents = parsed.events || [];

        const fullCurrentText = currentSections[sectionName];
        const fullPreviousText = previousSections[sectionName];

        for (const evt of sectionEvents) {
          const currentVerification = findSpanInText(evt.source_span_current || '', fullCurrentText);
          const previousVerification = findSpanInText(evt.source_span_previous || '', fullPreviousText);

          allEvents.push({
            extraction_run_id: runId,
            issuer: ticker,
            filing_type: current.filing_type,
            filing_date: current.filing_date,
            section: sectionName,
            event_type: evt.event_type,
            change_type: evt.change_type,
            change_category: evt.change_category || "semantic",
            materiality_level: evt.materiality_level || "moderate",
            intensity_delta: Math.min(5, Math.max(-5, evt.intensity_delta || 0)),
            description: evt.description,
            source_span_current: evt.source_span_current || null,
            source_span_previous: evt.source_span_previous || null,
            confidence: Math.min(1, Math.max(0, evt.confidence)),
            model_version: MODEL_VERSION,
            source_verified_current: evt.source_span_current ? currentVerification.verified : null,
            source_verified_previous: evt.source_span_previous ? previousVerification.verified : null,
            source_offset_current: currentVerification.offset,
            source_offset_previous: previousVerification.offset,
            source_context_current: currentVerification.context,
            source_context_previous: previousVerification.context,
          });
        }
      } catch (aiErr) {
        console.error(`AI processing error for ${sectionName}:`, aiErr);
      }
    }

    if (allEvents.length > 0) {
      const { error: evtErr } = await supabase.from("change_events").insert(allEvents);
      if (evtErr) console.error("Event insert error:", evtErr);
    }

    await supabase
      .from("extraction_runs")
      .update({
        status: "completed",
        sections_aligned: alignedSections.length,
        sections_total: allSectionNames.size,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(JSON.stringify({
      extraction_run_id: runId,
      events_count: allEvents.length,
      sections_aligned: alignedSections.length,
      sections_total: allSectionNames.size,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("extract-changes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
