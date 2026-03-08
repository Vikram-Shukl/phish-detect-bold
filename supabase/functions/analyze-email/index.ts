import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailContent } = await req.json();
    if (!emailContent || typeof emailContent !== "string") {
      return new Response(JSON.stringify({ error: "emailContent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a phishing email analyzer. Analyze the provided email for phishing indicators.

You MUST respond by calling the analyze_email function. Evaluate:
- Urgency/threat language
- Suspicious links or domains
- Spoofed sender identity
- Requests for credentials or personal info
- Grammar/spelling inconsistencies
- Mismatched reply-to addresses
- Too-good-to-be-true offers

Score from 0 (safe) to 100 (dangerous). Level: "safe" (0-30), "suspicious" (31-65), "dangerous" (66-100).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this email:\n\n${emailContent}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_email",
              description: "Return structured phishing analysis results",
              parameters: {
                type: "object",
                properties: {
                  level: {
                    type: "string",
                    enum: ["safe", "suspicious", "dangerous"],
                    description: "Threat level",
                  },
                  score: {
                    type: "number",
                    description: "Threat score 0-100",
                  },
                  redFlags: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of red flags found",
                  },
                  recommendation: {
                    type: "string",
                    description: "What the user should do next",
                  },
                },
                required: ["level", "score", "redFlags", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_email" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
