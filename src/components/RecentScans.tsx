import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ThreatLevel } from "@/components/AnalysisResults";

export interface ScanRecord {
  id: string;
  emailSnippet: string;
  level: ThreatLevel;
  score: number;
  timestamp: number;
}

const STORAGE_KEY = "phishguard_scans";

export function getScans(): ScanRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addScan(emailText: string, level: ThreatLevel, score: number) {
  const scans = getScans();
  scans.unshift({
    id: crypto.randomUUID(),
    emailSnippet: emailText.slice(0, 60).trim(),
    level,
    score,
    timestamp: Date.now(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans.slice(0, 5)));
}

export function clearScans() {
  localStorage.removeItem(STORAGE_KEY);
}

const badgeConfig: Record<ThreatLevel, string> = {
  safe: "bg-safe text-safe-foreground",
  suspicious: "bg-warning text-warning-foreground",
  dangerous: "bg-danger text-danger-foreground",
};

export function RecentScans({
  scans,
  onClear,
}: {
  scans: ScanRecord[];
  onClear: () => void;
}) {
  if (scans.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mt-12 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Recent Scans
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-destructive text-xs gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear History
        </Button>
      </div>

      <div className="space-y-2">
        {scans.map((scan) => (
          <div
            key={scan.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <Badge className={`${badgeConfig[scan.level]} text-xs px-2 py-0.5 shrink-0`}>
              {scan.level.toUpperCase()}
            </Badge>
            <span className="text-sm text-foreground truncate flex-1">
              {scan.emailSnippet}
              {scan.emailSnippet.length >= 60 && "…"}
            </span>
            <span className="text-sm font-bold text-muted-foreground shrink-0">
              {scan.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
