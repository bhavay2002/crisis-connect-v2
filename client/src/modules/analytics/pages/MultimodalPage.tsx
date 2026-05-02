import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Mic, Image, FileText, Zap, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface MultimodalResult {
  crisisType: string; urgency: number; confidence: number; severity: string;
  explanation: string; fusionScores: { text: number; voice: number; image: number };
  fusedScore: number; requiresHumanReview: boolean; source: string;
}

const SEV_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{(value * 100).toFixed(0)}%</span>
      </div>
      <Progress value={value * 100} className={`h-2 ${color}`} />
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
    mutationFn: () => apiRequest("/api/ai/multimodal-analyze", {
      method: "POST",
      body: JSON.stringify({ text, voiceTranscript, imageUrl, location }),
    }),
    onSuccess: (data: any) => {
      setResult(data);
      toast({ title: `Analysis complete — ${data.crisisType} (${data.source})` });
    },
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  const hasInput = text.trim() || voiceTranscript.trim() || imageUrl.trim();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            Multimodal AI Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Fuse text, voice transcripts, and images into a single weighted crisis intelligence score
          </p>
        </div>

        {/* Fusion weight info */}
        {info && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Text Signal",  weight: info.fusionWeights?.text,  icon: FileText, color: "text-blue-600"   },
              { label: "Voice Signal", weight: info.fusionWeights?.voice, icon: Mic,      color: "text-green-600"  },
              { label: "Image Signal", weight: info.fusionWeights?.image, icon: Image,    color: "text-purple-600" },
            ].map(({ label, weight, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-3 pb-3 flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-bold text-lg">{Math.round(weight * 100)}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <Card>
            <CardHeader><CardTitle>Input Signals</CardTitle><CardDescription>Provide one or more modalities — more signals = higher accuracy</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-1"><FileText className="w-3 h-3" />Text Report</Label>
                <Textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                  placeholder="Describe what you see: 'Building on fire near main road, people trapped on 3rd floor...'" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Mic className="w-3 h-3" />Voice Transcript</Label>
                <Textarea value={voiceTranscript} onChange={e => setVoiceTranscript(e.target.value)} rows={2}
                  placeholder="Paste voice-to-text transcript: 'There is heavy flooding, water is chest deep...'" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Image className="w-3 h-3" />Image URL</Label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/crisis-photo.jpg" />
              </div>
              <div>
                <Label>Location (optional)</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mumbai, Zone 4" />
              </div>
              <Button className="w-full" onClick={() => analyzeMutation.mutate()} disabled={!hasInput || analyzeMutation.isPending}>
                {analyzeMutation.isPending ? (
                  <><Zap className="w-4 h-4 mr-2 animate-pulse" />Analyzing all signals...</>
                ) : (
                  <><Brain className="w-4 h-4 mr-2" />Run Multimodal Analysis</>
                )}
              </Button>

              {/* Quick demo scenarios */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Quick test scenarios:</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "Flood", text: "Streets completely flooded, cars submerged", voice: "Help, water is rising fast, I am on roof" },
                    { label: "Fire", text: "Massive fire engulfing factory near highway", voice: "Fire everywhere, employees trapped" },
                    { label: "Earthquake", text: "Multiple buildings collapsed after tremors", voice: "Ground shaking, walls falling, get out" },
                  ].map(s => (
                    <Button key={s.label} size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => { setText(s.text); setVoiceTranscript(s.voice); }}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result panel */}
          <Card>
            <CardHeader><CardTitle>Analysis Result</CardTitle><CardDescription>Weighted fusion of all input signals</CardDescription></CardHeader>
            <CardContent>
              {!result ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Brain className="w-12 h-12 mb-3 opacity-30" />
                  <p>Awaiting analysis</p>
                  <p className="text-xs mt-1">Provide input signals and click Analyze</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Primary result */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Crisis Type</p>
                      <p className="text-xl font-bold capitalize">{result.crisisType.replace(/_/g, " ")}</p>
                    </div>
                    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${SEV_COLORS[result.severity]}`}>{result.severity.toUpperCase()}</span>
                  </div>

                  {/* Scores */}
                  <div className="space-y-2">
                    <ScoreBar label="Urgency" value={result.urgency} color="[&>div]:bg-red-500" />
                    <ScoreBar label="AI Confidence" value={result.confidence} color="[&>div]:bg-blue-500" />
                    <ScoreBar label="Fused Score" value={result.fusedScore} color="[&>div]:bg-purple-500" />
                  </div>

                  {/* Signal breakdown */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signal Breakdown</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-xs text-muted-foreground">Text (40%)</p><p className="font-bold">{(result.fusionScores.text * 100).toFixed(0)}%</p></div>
                      <div><p className="text-xs text-muted-foreground">Voice (30%)</p><p className="font-bold">{(result.fusionScores.voice * 100).toFixed(0)}%</p></div>
                      <div><p className="text-xs text-muted-foreground">Image (30%)</p><p className="font-bold">{(result.fusionScores.image * 100).toFixed(0)}%</p></div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Explanation</p>
                    <p className="text-sm">{result.explanation}</p>
                  </div>

                  {/* Human review flag */}
                  {result.requiresHumanReview ? (
                    <Alert className="border-orange-400 bg-orange-50">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <AlertDescription className="text-orange-700 font-medium">Human review required — low confidence or critical severity</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-400 bg-green-50">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-700">Auto-approved — confidence threshold met</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-muted-foreground">Source: {result.source === "ai" ? "GPT-4o Vision + Text" : "Heuristic fallback"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Human review triggers */}
        {info && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4" />Human Review Triggers</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {info.humanReviewTriggers?.map((t: string, i: number) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />{t}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">Model: {info.model}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
