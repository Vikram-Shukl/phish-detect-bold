import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnalysisResults, type AnalysisResult } from "@/components/AnalysisResults";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!emailText.trim()) return;
    setResult(null);
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-email", {
        body: { emailContent: emailText },
      });

      if (error) {
        throw new Error(error.message || "Analysis failed");
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data as AnalysisResult);
    } catch (e) {
      console.error("Analysis error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to analyze email. Please try again.");
    } finally {
      setAnalyzing(false);
    }
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
          disabled={!emailText.trim() || analyzing}
        >
          {analyzing ? "Scanning..." : "Analyze Email"}
        </Button>
      </div>

      {/* Results */}
      {result && <AnalysisResults result={result} />}
    </div>
  );
};

export default Index;
