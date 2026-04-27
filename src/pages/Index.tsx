import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisResults, type AnalysisResult } from "@/components/AnalysisResults";
import { RecentScans, getScans, addScan, clearScans, type ScanRecord } from "@/components/RecentScans";
import { toast } from "sonner";
import { KeyRound, Loader2, RotateCcw, Share2 } from "lucide-react";

const Index = () => {
  const [apiKey, setApiKey] = useState("");
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setScans(getScans());
  }, []);

  // Cooldown countdown timer + live toast updates
  useEffect(() => {
    if (cooldown <= 0) return;
    toast.error(`Rate limit exceeded — retrying in ${cooldown}s`, {
      id: "rate-limit",
      duration: Infinity,
    });
    const id = setInterval(() => {
      setCooldown((c) => {
        const next = c <= 1 ? 0 : c - 1;
        if (next === 0) {
          console.info(
            `[PhishGuard][rate-limit] Cooldown END at ${new Date().toISOString()} — input re-enabled`
          );
          toast.success("You can analyze again now.", { id: "rate-limit", duration: 3000 });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const startRateLimitCooldown = () => {
    console.warn(
      `[PhishGuard][rate-limit] Cooldown START at ${new Date().toISOString()} — Gemini 429, blocking input for 60s`
    );
    setCooldown(60);
  };

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    if (!apiKey.trim()) {
      toast.error("Please enter your Groq API key first.");
      return;
    }
    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown}s before retrying.`);
      return;
    }

    setResult(null);
    setAnalyzing(true);

    try {
      const prompt = `You are a cybersecurity expert specializing in phishing detection.
Analyze the following email and respond with ONLY a JSON object, no other text.
The JSON must have exactly these fields:
- threat_level: one of "SAFE", "SUSPICIOUS", or "DANGEROUS"
- score: a number from 0 to 100 (higher = more dangerous)
- red_flags: an array of strings describing suspicious elements (empty array if none)
- recommendation: a single sentence string with advice

Email:
${emailText}`;

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            temperature: 0.1,
            max_tokens: 512,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      if (response.status === 429) {
        startRateLimitCooldown();
        return;
      }
      if (response.status === 400 || response.status === 403) {
        toast.error("Invalid API key. Please check your Groq API key.");
        return;
      }
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response from Groq");

      const parsed = JSON.parse(text);
      const levelMap: Record<string, AnalysisResult["level"]> = {
        SAFE: "safe",
        SUSPICIOUS: "suspicious",
        DANGEROUS: "dangerous",
      };
      const analysisResult: AnalysisResult = {
        level: levelMap[String(parsed.threat_level).toUpperCase()] || "suspicious",
        score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
        redFlags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
        recommendation: parsed.recommendation || "Exercise caution with this email.",
      };

      setResult(analysisResult);
      addScan(emailText, analysisResult.level, analysisResult.score);
      setScans(getScans());
    } catch (e) {
      console.error("Analysis error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to analyze email. Check your API key and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setEmailText("");
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `🛡️ PhishGuard AI Scan Result\n\nVerdict: ${result.level.toUpperCase()}\nThreat Score: ${result.score}/100\n${result.redFlags.length > 0 ? `\nRed Flags:\n${result.redFlags.map(f => `• ${f}`).join("\n")}` : ""}\n\nRecommendation: ${result.recommendation}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "PhishGuard AI Result", text });
        return;
      } catch { /* fallback to clipboard */ }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Result copied to clipboard!");
  };

  const handleClearHistory = () => {
    clearScans();
    setScans([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-4xl">🛡️</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary-foreground">
          PhishGuard AI
        </h1>
      </div>
      <p className="text-muted-foreground text-sm tracking-widest uppercase mb-10">
        AI Powered Phishing Detector
      </p>

      {/* API Key Input */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            Groq API Key
          </label>
        </div>
        <Input
          type="password"
          placeholder="Enter your Groq API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="bg-card border-border text-foreground font-mono text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Get your key at{" "}
          <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-accent underline">
            console.groq.com
          </a>
        </p>
      </div>

      {/* Input Area */}
      <div className="w-full max-w-2xl space-y-4">
        <Textarea
          placeholder="Paste suspicious email here..."
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          disabled={analyzing || cooldown > 0}
          className="min-h-[220px] bg-card border-border text-foreground font-mono text-sm placeholder:text-muted-foreground resize-none focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {cooldown > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
            <span className="font-bold uppercase tracking-wider">Rate limit hit</span>
            <span className="font-mono tabular-nums">Retrying in {cooldown}s</span>
          </div>
        )}
        <Button
          className="w-full h-12 text-base font-bold tracking-wider uppercase"
          variant="destructive"
          onClick={handleAnalyze}
          disabled={!emailText.trim() || !apiKey.trim() || analyzing || cooldown > 0}
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : cooldown > 0 ? (
            `Retry in ${cooldown}s`
          ) : (
            "Analyze Email"
          )}
        </Button>
      </div>

      {/* Loading Spinner */}
      {analyzing && (
        <div className="w-full max-w-2xl mt-8 flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Scanning email for threats...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <AnalysisResults result={result} />
          <div className="w-full max-w-2xl mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-bold uppercase tracking-wider gap-2 border-border text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
              Analyze Another
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-bold uppercase tracking-wider gap-2 border-border text-muted-foreground hover:text-foreground"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Share Result
            </Button>
          </div>
        </>
      )}

      {/* Recent Scans */}
      <RecentScans scans={scans} onClear={handleClearHistory} />
    </div>
  );
};

export default Index;
