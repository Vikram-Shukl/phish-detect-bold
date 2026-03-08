import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnalysisResults, type AnalysisResult } from "@/components/AnalysisResults";

// Mock analysis for demo
function mockAnalyze(text: string): AnalysisResult {
  const len = text.trim().length;
  if (len < 50) {
    return {
      level: "safe",
      score: 12,
      redFlags: [],
      recommendation: "This email appears safe. No suspicious patterns were detected. Always stay vigilant with unexpected messages.",
    };
  }
  if (len < 200) {
    return {
      level: "suspicious",
      score: 58,
      redFlags: [
        "Urgency language detected (\"act now\", \"immediately\")",
        "Sender domain does not match organization name",
        "Contains a shortened or obfuscated URL",
      ],
      recommendation: "Proceed with caution. Do not click any links or download attachments. Verify the sender through an independent channel before responding.",
    };
  }
  return {
    level: "dangerous",
    score: 91,
    redFlags: [
      "Sender is spoofing a known organization",
      "Contains credential harvesting link",
      "Urgency language with threatening consequences",
      "Mismatched reply-to address",
      "Grammar and formatting inconsistencies",
    ],
    recommendation: "Do NOT interact with this email. Mark it as phishing/spam in your email client. If you already clicked a link, change your passwords immediately and enable two-factor authentication.",
  };
}

const Index = () => {
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!emailText.trim()) return;
    setResult(null);
    setAnalyzing(true);
    setTimeout(() => {
      setResult(mockAnalyze(emailText));
      setAnalyzing(false);
    }, 1500);
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
