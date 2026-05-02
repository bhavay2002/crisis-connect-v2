import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Mic, Image, FileText, Zap, AlertTriangle, CheckCircle } from "lucide-react";

interface MultimodalResult {
  crisisType: string; urgency: number; confidence: number; severity: string;
  explanation: string; fusionScores: { text: number; voice: number; image: number };
  fusedScore: number; requiresHumanReview: boolean; source: string;
}

const SEV_CFG: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
  high: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
};

function ScoreBar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const DEMOS = [
  { label: "🌊 Flood", text: "Streets completely flooded, cars submerged", voice: "Help, water is rising fast, I am on the roof" },
  { label: "🔥 Fire",  text: "Massive fire engulfing factory near highway", voice: "Fire everywhere, employees trapped inside"  },
  { label: "🏚 Quake", text: "Multiple buildings collapsed after tremors",  voice: "Ground shaking, walls falling, get out now" },
];

export default function MultimodalPage() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<MultimodalResult | null>(null);

  const { data: info } = useQuery<any>({ queryKey: ["/api/ai/multimodal-info"] });

  const analyzeMutation = useMutation({
    mutationFn: () => apiRequest("/api/ai/multimodal-analyze", { method: "POST", body: JSON.stringify({ text, voiceTranscript, imageUrl, location }) }),
    onSuccess: (data: any) => { setResult(data); toast({ title: `Analysis complete — ${data.crisisType} (${data.source})` }); },
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const hasInput = text.trim() || voiceTranscript.trim() || imageUrl.trim();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <h1 className="text-2xl font-black">Multimodal AI Analysis</h1>
            </div>
            <p className="text-sm text-muted-foreground">Fuse text, voice transcripts, and images into a single weighted crisis intelligence score</p>
          </div>
          <Badge variant="outline" className="border-purple-300 text-purple-600 bg-purple-50 dark:bg-purple-950">§17.1</Badge>
        </div>

        {/* Fusion weight cards */}
        {info && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Text Signal",  weight: info.fusionWeights?.text,  icon: FileText, color: "text-blue-600",   bg: "bg-blue-500/10"    },
              { label: "Voice Signal", weight: info.fusionWeights?.voice, icon: Mic,      color: "text-green-600",  bg: "bg-green-500/10"   },
              { label: "Image Signal", weight: info.fusionWeights?.image, icon: Image,    color: "text-purple-600", bg: "bg-purple-500/10"  },
            ].map(({ label, weight, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border bg-background p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-black">{Math.round(weight * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="rounded-2xl border bg-background p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Input Signals</h2>
              <p className="text-xs text-muted-foreground">More signals = higher accuracy</p>
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><FileText className="w-3.5 h-3.5 text-blue-500" />Text Report</Label>
              <Textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                placeholder="Describe what you see: 'Building on fire near main road, people trapped on 3rd floor…'" className="resize-none" />
            </div>
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><Mic className="w-3.5 h-3.5 text-green-500" />Voice Transcript</Label>
              <Textarea value={voiceTranscript} onChange={e => setVoiceTranscript(e.target.value)} rows={2}
                placeholder="Paste voice-to-text transcript: 'There is heavy flooding, water is chest deep…'" className="resize-none" />
            </div>
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"><Image className="w-3.5 h-3.5 text-purple-500" />Image URL</Label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/crisis-photo.jpg" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Location (optional)</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mumbai, Zone 4" />
            </div>

            {/* Quick demos */}
            <div className="pt-1 border-t">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick demo scenarios:</p>
              <div className="flex flex-wrap gap-2">
                {DEMOS.map(s => (
                  <Button key={s.label} size="sm" variant="outline" className="h-7 text-xs rounded-lg"
                    onClick={() => { setText(s.text); setVoiceTranscript(s.voice); }}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-semibold" onClick={() => analyzeMutation.mutate()} disabled={!hasInput || analyzeMutation.isPending}>
              {analyzeMutation.isPending
                ? <><Zap className="w-4 h-4 mr-2 animate-pulse" />Analyzing all signals…</>
                : <><Brain className="w-4 h-4 mr-2" />Run Multimodal Analysis</>}
            </Button>
          </div>

          {/* Result panel */}
          <div className="rounded-2xl border bg-background p-6">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-4">Analysis Result</h2>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-full min-h-48 text-muted-foreground">
                <Brain className="w-14 h-14 mb-3 opacity-15" />
                <p className="font-semibold">Awaiting analysis</p>
                <p className="text-xs mt-1">Provide input signals and click Analyze</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Primary */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Crisis Type</p>
                    <p className="text-2xl font-black capitalize">{result.crisisType.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full border uppercase ${SEV_CFG[result.severity]}`}>
                    {result.severity}
                  </span>
                </div>

                {/* Score bars */}
                <div className="space-y-3">
                  <ScoreBar label="Urgency"       value={result.urgency}     colorClass="bg-red-500"    />
                  <ScoreBar label="AI Confidence" value={result.confidence}  colorClass="bg-blue-500"   />
                  <ScoreBar label="Fused Score"   value={result.fusedScore}  colorClass="bg-purple-500" />
                </div>

                {/* Signal breakdown */}
                <div className="p-4 rounded-xl bg-muted/40 border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Signal Breakdown</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Text (40%)",  value: result.fusionScores.text  },
                      { label: "Voice (30%)", value: result.fusionScores.voice },
                      { label: "Image (30%)", value: result.fusionScores.image },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-lg font-black">{(value * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">AI Explanation</p>
                  <p className="text-sm leading-relaxed">{result.explanation}</p>
                </div>

                {/* Review flag */}
                {result.requiresHumanReview ? (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Human review required — low confidence or critical severity</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">Auto-approved — confidence threshold met</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">Source: {result.source === "ai" ? "GPT-4o Vision + Text" : "Heuristic fallback"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Trigger rules */}
        {info && (
          <div className="rounded-2xl border bg-background p-6">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-3">Human Review Trigger Rules</h2>
            <div className="flex flex-wrap gap-2">
              {info.humanReviewTriggers?.map((t: string, i: number) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />{t}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Model: {info.model}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
