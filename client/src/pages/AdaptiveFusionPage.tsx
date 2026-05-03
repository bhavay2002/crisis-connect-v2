import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, TrendingUp, Sliders, Target, Activity, GitBranch,
  ChevronRight, CheckCircle2, XCircle, AlertTriangle, Zap,
  BarChart3, RefreshCw, ArrowUpRight, Info, Shield
} from "lucide-react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModelState {
  model: {
    version:     string;
    sampleCount: number;
    isAdaptive:  boolean;
    mode:        string;
    algorithm:   string;
    learningRate:number;
    bias:        number;
  };
  weights: { feature: string; weight: number; label: string; description: string }[];
  metrics: { precision: number | null; recall: number | null; f1: number | null; sampleCount: number };
  recentVersions: { version: string; sampleCount: number; isActive: boolean; createdAt: string }[];
  guardrails: { minWeight: number; maxWeight: number; normalization: string; fallback: string };
}

interface PerformanceData {
  currentMetrics: { precision: number | null; recall: number | null; f1: number | null; totalLabeled: number };
  weightHistory: {
    version: string; sampleCount: number;
    weights: Record<string, number>;
    precision: number | null; recall: number | null; f1: number | null;
    isActive: boolean; createdAt: string;
  }[];
  recentOutcomes: { reportId: string; isRealCrisis: boolean; falsePositive: boolean; labelSource: string; createdAt: string }[];
}

interface SimResult {
  features: Record<string, number>;
  prediction: { crisisProbability: number; label: string; confidence: number; modelVersion: string };
  weights: Record<string, number>;
}

// ── Feature colour map ─────────────────────────────────────────────────────────

const FEATURE_COLORS: Record<string, string> = {
  "AI Score":          "bg-violet-500",
  "Location Risk":     "bg-red-500",
  "Repetition Score":  "bg-orange-500",
  "User Trust":        "bg-emerald-500",
  "Weather Risk":      "bg-sky-500",
  "Social Signal":     "bg-pink-500",
};

const FEATURE_KEYS = ["aiScore","locationRisk","repetitionScore","userTrust","weatherScore","socialScore"];
const FEATURE_LABELS: Record<string,string> = {
  aiScore: "AI Score", locationRisk: "Location Risk",
  repetitionScore: "Repetition Score", userTrust: "User Trust",
  weatherScore: "Weather Risk", socialScore: "Social Signal",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(v: number | null) { return v != null ? `${(v * 100).toFixed(1)}%` : "—"; }
function fmt(v: number) { return (v * 100).toFixed(1); }

function MetricPill({ label, value, good }: { label: string; value: number | null; good?: boolean }) {
  const color = value == null ? "bg-muted text-muted-foreground"
    : good === undefined ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    : value >= 0.75 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : value >= 0.5  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    : "bg-red-500/10 text-red-400 border border-red-500/20";
  return (
    <div className={`rounded-lg px-4 py-3 text-center ${color}`}>
      <div className="text-2xl font-bold tabular-nums">{pct(value)}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdaptiveFusionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [simFeatures, setSimFeatures] = useState<Record<string,number>>({
    aiScore: 0.6, locationRisk: 0.4, repetitionScore: 0.2,
    userTrust: 0.7, weatherScore: 0.1, socialScore: 0.0,
  });
  const [showGuardrails, setShowGuardrails] = useState(false);

  const { data: model, isLoading: modelLoading } = useQuery<ModelState>({
    queryKey: ["/api/fusion/model"],
    refetchInterval: 15_000,
  });

  const { data: perf, isLoading: perfLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/fusion/performance"],
    refetchInterval: 30_000,
  });

  const simMutation = useMutation({
    mutationFn: (features: Record<string,number>) =>
      apiRequest("/api/fusion/simulate", { method: "POST", body: JSON.stringify(features) }).then(r => r.json()),
    onSuccess: () => {},
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const [simResult, setSimResult] = useState<SimResult | null>(null);

  const runSim = async () => {
    const result = await simMutation.mutateAsync(simFeatures);
    setSimResult(result);
  };

  if (modelLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const w = model?.weights ?? [];
  const maxWeight = Math.max(...w.map(x => x.weight), 0.01);

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Adaptive Signal Fusion"
        description="Logistic regression model that learns fusion weights from labeled outcomes — replacing hardcoded static weights."
        live
        actions={
          <Button size="sm" variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ["/api/fusion/model"] }); qc.invalidateQueries({ queryKey: ["/api/fusion/performance"] }); }}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        }
      />

      {/* ── Architecture banner ─────────────────────────────────────────────── */}
      <Card className="border border-violet-500/20 bg-violet-500/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {[
              { label: "Report Created", icon: ChevronRight },
              { label: "Feature Extraction", icon: ChevronRight },
              { label: "Logistic Regression", icon: ChevronRight },
              { label: "Fused Score", icon: ChevronRight },
              { label: "Decision Engine", icon: ChevronRight },
              { label: "Outcome Labeled", icon: ChevronRight },
              { label: "SGD Weight Update", icon: null },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`px-2 py-1 rounded text-xs font-medium ${i === 2 ? "bg-violet-500 text-white" : i === 5 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : i === 6 ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" : "bg-muted text-muted-foreground"}`}>
                  {step.label}
                </div>
                {step.icon && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500" /> Inference path</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Feedback path</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Learning loop</span>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Brain className="w-8 h-8 text-violet-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Model Version</div>
              <div className="font-bold font-mono text-sm">{model?.model.version ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{model?.model.mode}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Labeled Outcomes</div>
              <div className="font-bold text-2xl">{model?.model.sampleCount ?? 0}</div>
              <div className="text-xs text-muted-foreground">training samples</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="w-8 h-8 text-sky-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Precision</div>
              <div className="font-bold text-2xl">{pct(model?.metrics.precision ?? null)}</div>
              <div className="text-xs text-muted-foreground">true positive rate</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">F1 Score</div>
              <div className="font-bold text-2xl">{pct(model?.metrics.f1 ?? null)}</div>
              <div className="text-xs text-muted-foreground">harmonic mean P/R</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Current Weight Vector ───────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="w-4 h-4 text-violet-400" />
              Current Weight Vector
              {model?.model.isAdaptive
                ? <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Adaptive</Badge>
                : <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">Static Priors</Badge>}
            </CardTitle>
            <CardDescription className="text-xs">
              Learned weights — sum to 1, clamped to [{model?.guardrails.minWeight}–{model?.guardrails.maxWeight}]
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {w.map((feat) => (
              <motion.div
                key={feat.feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-1"
              >
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${FEATURE_COLORS[feat.label] ?? "bg-muted"}`} />
                    <span className="font-medium">{feat.label}</span>
                  </div>
                  <span className="font-mono text-xs tabular-nums">{fmt(feat.weight)}%</span>
                </div>
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${FEATURE_COLORS[feat.label] ?? "bg-primary"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(feat.weight / maxWeight) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-muted-foreground pl-4">{feat.description}</div>
              </motion.div>
            ))}

            {showGuardrails && (
              <div className="mt-4 pt-4 border-t space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-blue-400" /> Guardrails active</div>
                <div>Min weight: {model?.guardrails.minWeight} &nbsp;|&nbsp; Max weight: {model?.guardrails.maxWeight}</div>
                <div>Normalization: {model?.guardrails.normalization}</div>
                <div>Fallback: {model?.guardrails.fallback}</div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Switch id="guardrails" checked={showGuardrails} onCheckedChange={setShowGuardrails} />
              <Label htmlFor="guardrails" className="text-xs text-muted-foreground">Show guardrails</Label>
            </div>
          </CardContent>
        </Card>

        {/* ── Model Metrics ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              Model Performance
            </CardTitle>
            <CardDescription className="text-xs">
              Evaluated on labeled outcomes &nbsp;·&nbsp; {perf?.currentMetrics.totalLabeled ?? 0} samples total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricPill label="Precision" value={perf?.currentMetrics.precision ?? null} />
              <MetricPill label="Recall"    value={perf?.currentMetrics.recall ?? null}    />
              <MetricPill label="F1 Score"  value={perf?.currentMetrics.f1 ?? null}        />
            </div>

            {(perf?.currentMetrics.totalLabeled ?? 0) === 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  No labeled outcomes yet. Label report outcomes via <code className="font-mono">POST /api/fusion/outcomes/:id</code> to start training the model.
                </div>
              </div>
            )}

            {/* Version history */}
            {(perf?.weightHistory.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Recent Model Versions</div>
                {perf?.weightHistory.slice(0, 5).map((h) => (
                  <div key={h.version} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{h.version}</span>
                      {h.isActive && <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] px-1.5 py-0">active</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{h.sampleCount} samples</span>
                      {h.f1 != null && <span>F1 {pct(h.f1)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Simulator ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-amber-400" />
            Model Simulator
          </CardTitle>
          <CardDescription className="text-xs">
            Drag signal sliders to see how the current weight vector classifies an incident
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sliders */}
            <div className="space-y-4">
              {FEATURE_KEYS.map(k => (
                <div key={k} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${FEATURE_COLORS[FEATURE_LABELS[k]] ?? "bg-muted"}`} />
                      {FEATURE_LABELS[k]}
                    </span>
                    <span className="font-mono text-xs tabular-nums">{fmt(simFeatures[k])}%</span>
                  </div>
                  <Slider
                    min={0} max={100} step={1}
                    value={[simFeatures[k] * 100]}
                    onValueChange={([v]) => setSimFeatures(f => ({ ...f, [k]: v / 100 }))}
                    className="w-full"
                  />
                </div>
              ))}
              <Button onClick={runSim} disabled={simMutation.isPending} className="w-full">
                {simMutation.isPending ? <><RefreshCw className="w-3 h-3 mr-2 animate-spin" />Running…</> : <><Zap className="w-3 h-3 mr-2" />Run Simulation</>}
              </Button>
            </div>

            {/* Result */}
            <div className="flex flex-col gap-4">
              {simResult ? (
                <>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`rounded-xl p-6 text-center border ${
                      simResult.prediction.label === "real-crisis"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-emerald-500/10 border-emerald-500/30"
                    }`}
                  >
                    {simResult.prediction.label === "real-crisis"
                      ? <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                      : <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />}
                    <div className={`text-3xl font-bold ${simResult.prediction.label === "real-crisis" ? "text-red-400" : "text-emerald-400"}`}>
                      {(simResult.prediction.crisisProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm mt-1 font-medium capitalize">
                      {simResult.prediction.label.replace("-", " ")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Confidence: {(simResult.prediction.confidence * 100).toFixed(1)}% · {simResult.prediction.modelVersion}
                    </div>
                  </motion.div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Feature contributions</div>
                    {FEATURE_KEYS.map(k => {
                      const fv = simFeatures[k];
                      const wv = (simResult.weights[k] ?? 0);
                      const contrib = fv * wv;
                      return (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${FEATURE_COLORS[FEATURE_LABELS[k]] ?? "bg-muted"} shrink-0`} />
                          <span className="w-32 text-muted-foreground">{FEATURE_LABELS[k]}</span>
                          <div className="flex-1 bg-muted h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${FEATURE_COLORS[FEATURE_LABELS[k]] ?? "bg-primary"} rounded-full`} style={{ width: `${Math.min(100, contrib * 200)}%` }} />
                          </div>
                          <span className="font-mono w-10 text-right">{(contrib * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                  <Brain className="w-12 h-12 opacity-20" />
                  <div className="text-sm">Adjust sliders and run the simulation to see how the model classifies this signal combination</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Outcomes ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            Outcome Feed
            <Badge variant="outline" className="text-xs font-normal ml-auto">
              Training labels → weight updates
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(perf?.recentOutcomes.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-10 h-10 opacity-20 mx-auto mb-2" />
              <div className="text-sm">No outcomes labeled yet.</div>
              <div className="text-xs mt-1">
                Use <code className="font-mono">POST /api/fusion/outcomes/:reportId</code> with <code className="font-mono">{"{ isRealCrisis: true|false }"}</code> to label a report and trigger a weight update.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {perf?.recentOutcomes.map((o, i) => (
                <motion.div
                  key={o.reportId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm"
                >
                  <div className="flex items-center gap-3">
                    {o.isRealCrisis
                      ? <XCircle className="w-4 h-4 text-red-400" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span className="font-mono text-xs text-muted-foreground">{o.reportId.slice(0, 12)}…</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {o.labelSource}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={o.isRealCrisis ? "text-red-400" : "text-emerald-400"}>
                      {o.isRealCrisis ? "Real Crisis" : "Non-Crisis"}
                    </span>
                    <span>{new Date(o.createdAt).toLocaleTimeString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Service Architecture ─────────────────────────────────────────────── */}
      <Card className="border border-blue-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="w-4 h-4 text-blue-400" />
            Service Architecture — Strangler Fig Pattern
          </CardTitle>
          <CardDescription className="text-xs">
            Logical service boundaries defined. Physical extraction follows as traffic grows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { name: "AI Service", phase: 2, color: "violet", owns: ["inference", "XAI", "fusion"], status: "boundary-defined" },
              { name: "Realtime", phase: 3, color: "sky", owns: ["WebSocket", "pub/sub", "rooms"], status: "boundary-defined" },
              { name: "Analytics", phase: 4, color: "emerald", owns: ["metrics", "dashboards", "CQRS"], status: "boundary-defined" },
              { name: "Fusion", phase: 2, color: "amber", owns: ["feature store", "SGD", "outcomes"], status: "boundary-defined" },
              { name: "Core API", phase: 5, color: "red", owns: ["auth", "RBAC", "orchestration"], status: "last-to-extract" },
            ].map((svc, i) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-lg border p-3 border-${svc.color}-500/20 bg-${svc.color}-500/5`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm">{svc.name}</div>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">Phase {svc.phase}</Badge>
                </div>
                <div className="space-y-1">
                  {svc.owns.map(o => (
                    <div key={o} className="text-xs text-muted-foreground flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />{o}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">{svc.status}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
            <div>
              <span className="font-medium text-foreground">Migration path: </span>
              Phase 1 (current) — modular monolith with explicit boundaries &nbsp;→&nbsp;
              Phase 2 — extract AI + Fusion services (set process isolation) &nbsp;→&nbsp;
              Phase 3 — extract Realtime (set <code className="font-mono">REDIS_URL</code> for multi-node pub/sub) &nbsp;→&nbsp;
              Phase 4 — Analytics CQRS replica &nbsp;→&nbsp;
              Phase 5 — Core API becomes BFF + API gateway.
              View full architecture at <code className="font-mono">GET /api/services/health</code>.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
