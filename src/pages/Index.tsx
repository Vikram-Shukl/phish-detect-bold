import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AnalysisResults, type AnalysisResult } from "@/components/AnalysisResults";
import { RecentScans, getScans, addScan, clearScans, type ScanRecord } from "@/components/RecentScans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Loader2, RotateCcw, Share2 } from "lucide-react";

const Index = () => {
  const [apiKey, setApiKey] = useState("");
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    setScans(getScans());
  }, []);

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    if (!apiKey.trim()) {
      toast.error("Please enter your Gemini API key first.");
      return;
    }

    setResult(null);
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-email", {
        body: { emailContent: emailText, apiKey: apiKey.trim() },
      });

      if (error) throw new Error(error.message || "Analysis failed");
      if (data?.error) { toast.error(data.error); return; }

      const analysisResult = data as AnalysisResult;
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
            Gemini API Key
          </label>
        </div>
        <Input
          type="password"
          placeholder="Enter your Google Gemini API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="bg-card border-border text-foreground font-mono text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Get your key at{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-accent underline">
            aistudio.google.com/apikey
          </a>
        </p>
      </div>

      {/* Input Area */}
      <div className="w-full max-w-2xl space-y-4">
        <Textarea
          placeholder="Paste suspicious email here..."
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          className="min-h-[220px] bg-card border-border text-foreground font-mono text-sm placeholder:text-muted-foreground resize-none focus-visible:ring-primary"
        />
        <Button
          className="w-full h-12 text-base font-bold tracking-wider uppercase"
          variant="destructive"
          onClick={handleAnalyze}
          disabled={!emailText.trim() || !apiKey.trim() || analyzing}
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
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
          <div className="w-full max-w-2xl mt-4">
            <Button
              variant="outline"
              className="w-full h-10 text-sm font-bold uppercase tracking-wider gap-2 border-border text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
              Analyze Another
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
