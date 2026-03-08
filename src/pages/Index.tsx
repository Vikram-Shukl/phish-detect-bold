import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const Index = () => {
  const [emailText, setEmailText] = useState("");

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
        >
          Analyze Email
        </Button>
      </div>

      {/* Results Section */}
      <div className="w-full max-w-2xl mt-8 rounded-lg border border-border bg-card p-6 min-h-[120px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Results will appear here after analysis.
        </p>
      </div>
    </div>
  );
};

export default Index;
