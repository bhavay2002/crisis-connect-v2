import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  low:      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  medium:   "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
  high:     "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
};

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

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
  const DEMOS = [
    { label: "🌊 Flood",      text: "Streets completely flooded, cars submerged, water level rising fast", voice: "Help, water is chest deep, I am on roof, please send boats" },
    { label: "🔥 Fire",       text: "Massive fire engulfing industrial factory near highway overpass",     voice: "Fire everywhere, employees trapped inside, black smoke visible" },
    { label: "🏚 Earthquake", text: "Multiple buildings collapsed after strong tremors, rubble everywhere", voice: "Ground shaking violently, walls collapsing, get everyone out now" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-500" />
            </div>
            <h1 className="text-2xl font-black">Multimodal AI Fusion</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Text + Voice + Image signals fused via GPT-4o vision — 40/30/30 weighted scoring with explainable output
          </p>
        </div>

        {/* Signal weight cards */}
        {info && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Text Signal",  weight: info.fusionWeights?.text,  icon: FileText, color: "text-blue-500",   bg: "bg-blue-500/10"   },
              { label: "Voice Signal", weight: info.fusionWeights?.voice, icon: Mic,      color: "text-green-500",  bg: "bg-green-500/10"  },
              { label: "Image Signal", weight: info.fusionWeights?.image, icon: Image,    color: "text-purple-500", bg: "bg-purple-500/10" },
            ].map(({ label, weight, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border bg-background p-4 shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-black ${color}`}>{Math.round(weight * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="rounded-2xl border bg-background p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-sm">Input Signals</h2>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                <FileText className="w-3 h-3" />Text Report <span className="text-blue-500">40%</span>
              </Label>
              <Textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="text-sm resize-none"
                placeholder="Describe what you see: 'Building on fire near main road, people trapped on 3rd floor...'" />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                <Mic className="w-3 h-3" />Voice Transcript <span className="text-green-500">30%</span>
              </Label>
              <Textarea value={voiceTranscript} onChange={e => setVoiceTranscript(e.target.value)} rows={2} className="text-sm resize-none"
                placeholder="Paste voice-to-text transcript: 'There is heavy flooding, water is chest deep...'" />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1.5 block">
                <Image className="w-3 h-3" />Image URL <span className="text-purple-500">30%</span>
              </Label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="text-sm h-9"
                placeholder="https://example.com/crisis-photo.jpg" />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Location (optional)</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} className="text-sm h-9" placeholder="e.g. Mumbai, Zone 4" />
            </div>

            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold" onClick={() => analyzeMutation.mutate()} disabled={!hasInput || analyzeMutation.isPending}>
              {analyzeMutation.isPending ? (
                <><Zap className="w-4 h-4 mr-2 animate-pulse" />Analyzing all signals…</>
              ) : (
                <><Brain className="w-4 h-4 mr-2" />Run Multimodal Analysis</>
              )}
            </Button>

            {/* Quick demo scenarios */}
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground font-medium mb-2">Quick test scenarios</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMOS.map(s => (
                  <Button key={s.label} size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => { setText(s.text); setVoiceTranscript(s.voice); }}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Result panel */}
          <div className="rounded-2xl border bg-background p-5 shadow-sm">
            <h2 className="font-bold text-sm mb-4">Analysis Result</h2>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Brain className="w-14 h-14 mb-4 opacity-15" />
                <p className="font-semibold">Awaiting analysis</p>
                <p className="text-xs mt-1.5">Provide input signals and click Analyze</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Primary result */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Crisis Type</p>
                    <p className="text-xl font-black capitalize">{result.crisisType.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full font-bold border uppercase ${SEV_CFG[result.severity]}`}>{result.severity}</span>
                </div>

                {/* Score bars */}
                <div className="space-y-3">
                  <ScoreRow label="Urgency"        value={result.urgency}     color="bg-red-500"    />
                  <ScoreRow label="AI Confidence"  value={result.confidence}  color="bg-blue-500"   />
                  <ScoreRow label="Fused Score"    value={result.fusedScore}  color="bg-purple-500" />
                </div>

                {/* Signal breakdown */}
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2.5">Signal Breakdown (Weighted)</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Text (40%)",  value: result.fusionScores.text,  color: "text-blue-500"   },
                      { label: "Voice (30%)", value: result.fusionScores.voice, color: "text-green-500"  },
                      { label: "Image (30%)", value: result.fusionScores.image, color: "text-purple-500" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={`font-black text-lg ${color}`}>{(value * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">AI Explanation</p>
                  <p className="text-sm leading-relaxed">{result.explanation}</p>
                </div>

                {/* Human review flag */}
                {result.requiresHumanReview ? (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Human review required</p>
                      <p className="text-xs text-orange-600 dark:text-orange-500">Low confidence or critical severity — queued for admin review</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">Auto-approved — confidence threshold met</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Source: <span className="font-mono">{result.source === "ai" ? "GPT-4o Vision + Text" : "Heuristic fallback"}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Human review triggers */}
        {info && (
          <div className="rounded-2xl border bg-background p-5 shadow-sm">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />Human Review Triggers
            </h3>
            <div className="flex flex-wrap gap-2">
              {info.humanReviewTriggers?.map((t: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 font-medium">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Model: <span className="font-mono">{info.model}</span></p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
