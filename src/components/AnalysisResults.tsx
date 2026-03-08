import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Lightbulb } from "lucide-react";

export type ThreatLevel = "safe" | "suspicious" | "dangerous";

export interface AnalysisResult {
  level: ThreatLevel;
  score: number;
  redFlags: string[];
  recommendation: string;
}

const config: Record<ThreatLevel, { label: string; icon: React.ReactNode; badgeClass: string; barClass: string }> = {
  safe: {
    label: "SAFE",
    icon: <ShieldCheck className="w-6 h-6" />,
    badgeClass: "bg-safe text-safe-foreground border-safe/30 text-lg px-6 py-2",
    barClass: "[&>div]:bg-safe",
  },
  suspicious: {
    label: "SUSPICIOUS",
    icon: <ShieldAlert className="w-6 h-6" />,
    badgeClass: "bg-warning text-warning-foreground border-warning/30 text-lg px-6 py-2",
    barClass: "[&>div]:bg-warning",
  },
  dangerous: {
    label: "DANGEROUS",
    icon: <ShieldX className="w-6 h-6" />,
    badgeClass: "bg-danger text-danger-foreground border-danger/30 text-lg px-6 py-2",
    barClass: "[&>div]:bg-danger",
  },
};

export function AnalysisResults({ result }: { result: AnalysisResult }) {
  const c = config[result.level];

  return (
    <div className="w-full max-w-2xl mt-8 space-y-4 animate-fade-in">
      {/* Verdict Badge */}
      <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center gap-3">
        <Badge className={c.badgeClass}>
          <span className="mr-2">{c.icon}</span>
          {c.label}
        </Badge>
      </div>

      {/* Threat Score */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Threat Score</span>
          <span className="text-2xl font-bold text-foreground">{result.score}<span className="text-sm text-muted-foreground">/100</span></span>
        </div>
        <Progress value={result.score} className={`h-3 ${c.barClass}`} />
      </div>

      {/* Red Flags */}
      {result.redFlags.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Red Flags Found</span>
          </div>
          <ul className="space-y-2">
            {result.redFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-danger mt-0.5">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-6 space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <Lightbulb className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wider">What To Do Next</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.recommendation}</p>
      </div>
    </div>
  );
}
