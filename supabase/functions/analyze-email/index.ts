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
    const { emailContent, apiKey } = await req.json();

    if (!emailContent || typeof emailContent !== "string") {
      return new Response(JSON.stringify({ error: "emailContent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(JSON.stringify({ error: "Gemini API key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a cybersecurity expert. Analyze this email for phishing. Return ONLY valid JSON (no markdown, no code blocks, no extra text). All string values MUST be on a single line with no literal newline characters — escape any newlines as \\n. Escape any double quotes inside strings as \\". Schema:\n{"threat_level": "SAFE" | "SUSPICIOUS" | "DANGEROUS", "score": 0-100, "red_flags": ["string", "string"], "recommendation": "string"}\n\nEmail to analyze:\n${emailContent}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 400 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Invalid API key. Please check your Gemini API key." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response from Gemini");
    }

    // Extract JSON: strip markdown fences, then isolate the outermost {...} block
    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Repair: escape literal newlines/tabs/carriage returns inside string values
      const repaired = cleaned.replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (_m, inner) =>
          `"${inner
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t")}"`
      );
      try {
        parsed = JSON.parse(repaired);
      } catch {
        console.error("Failed to parse Gemini JSON. Raw text:", text);
        throw parseErr;
      }
    }

    // Normalize to our format
    const levelMap: Record<string, string> = {
      SAFE: "safe",
      SUSPICIOUS: "suspicious",
      DANGEROUS: "dangerous",
    };

    const result = {
      level: levelMap[parsed.threat_level?.toUpperCase()] || "suspicious",
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      redFlags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      recommendation: parsed.recommendation || "Exercise caution with this email.",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-email error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const isJsonError = message.includes("JSON");
    return new Response(
      JSON.stringify({ error: isJsonError ? "Failed to parse AI response. Please try again." : message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
