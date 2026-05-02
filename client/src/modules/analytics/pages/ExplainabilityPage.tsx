import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Brain, Shield, AlertTriangle, CheckCircle, Clock, Zap, Eye, BarChart3 } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};
const FUSION_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899"];

interface Decision {
  reportId: string;
  title: string;
  type: string;
  severity: string;
  location: string;
  createdAt: string;
  auditId: string;
  confidence: number;
  fusedPriority: string;
  finalScore: number;
  triggered: boolean;
  urgencyLevel: string;
  isSuspicious: boolean;
  isGenuineEmergency: boolean;
  components: {
    aiUrgency: number;
    locationRisk: number;
    repetitionScore: number;
    userTrustScore: number;
  };
  weights: {
    aiUrgency: number;
    locationRisk: number;
    repetitionScore: number;
    userTrustScore: number;
  };
  contributingFactors: Array<{ factor: string; weight: number; description: string }>;
  reasoning: string;
  recommendations: string[];
}

interface DecisionsResponse {
  decisions: Decision[];
  total: number;
  page: number;
  limit: number;
}

function componentLabel(key: string) {
  return { aiUrgency: "AI Urgency", locationRisk: "Location Risk", repetitionScore: "Repetition", userTrustScore: "User Trust" }[key] ?? key;
}

export default function ExplainabilityPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: decisionsData, isLoading } = useQuery<DecisionsResponse>({
    queryKey: ["/api/ai/decisions", page],
    queryFn: () =>
      fetch(`/api/ai/decisions?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      }).then(r => r.json()),
  });

  const { data: explain, isLoading: explainLoading } = useQuery({
    queryKey: ["/api/ai/explain", selectedId],
    queryFn: () =>
      fetch(`/api/ai/explain/${selectedId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      }).then(r => r.json()),
    enabled: !!selectedId,
  });

  const decisions = decisionsData?.decisions ?? [];
  const selected = decisions.find(d => d.reportId === selectedId);

  const fusionComponents = explain
    ? [
        { name: "AI Urgency", value: Math.round((explain.fusedScore?.components?.aiUrgency ?? 0) * 100), weight: 50 },
        { name: "Location Risk", value: Math.round((explain.fusedScore?.components?.locationRisk ?? 0) * 100), weight: 20 },
        { name: "Repetition", value: Math.round((explain.fusedScore?.components?.repetitionScore ?? 0) * 100), weight: 20 },
        { name: "User Trust", value: Math.round((explain.fusedScore?.components?.userTrustScore ?? 0) * 100), weight: 10 },
      ]
    : [];

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-indigo-500" />
              </div>
              <h1 className="text-2xl font-black">AI Explainability</h1>
            </div>
            <p className="text-sm text-muted-foreground">Audit trail for every AI decision — contributing factors, signal fusion weights, and decision reasoning</p>
          </div>
          <span className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-semibold bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
            {decisionsData?.total ?? 0} decisions logged
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Decision list */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Recent Decisions
            </h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : decisions.length === 0 ? (
              <Alert>
                <AlertDescription>No AI decisions recorded yet. Submit a report to generate decisions.</AlertDescription>
              </Alert>
            ) : (
              decisions.map(d => (
                <button
                  key={d.reportId}
                  onClick={() => setSelectedId(d.reportId)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedId === d.reportId
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-border hover:border-indigo-300 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.location}</p>
                    </div>
                    <Badge
                      className="text-xs shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[d.fusedPriority] ?? "#94a3b8" }}
                    >
                      {d.fusedPriority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">{d.type}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(d.confidence * 100)}% confidence
                    </span>
                    {d.isSuspicious && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">⚠ Suspicious</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Audit: <span className="font-mono">{d.auditId.slice(0, 20)}…</span>
                  </p>
                </button>
              ))
            )}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <Button size="sm" variant="outline" disabled={(decisionsData?.total ?? 0) <= page * 20} onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            {!selectedId ? (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Select a decision to view its explanation</p>
                </div>
              </div>
            ) : explainLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : explain ? (
              <Tabs defaultValue="fusion">
                <TabsList>
                  <TabsTrigger value="fusion">Signal Fusion</TabsTrigger>
                  <TabsTrigger value="factors">Contributing Factors</TabsTrigger>
                  <TabsTrigger value="classification">Classification</TabsTrigger>
                  <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                </TabsList>

                <TabsContent value="fusion" className="space-y-3 mt-4">
                  <div className="rounded-2xl border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <h3 className="font-bold text-sm">Signal Fusion Breakdown</h3>
                    </div>
                    <p className="text-xs text-muted-foreground pl-9 mb-4">
                      Final score: {Math.round((explain.fusedScore?.finalScore ?? 0) * 100)}% → Priority:{" "}
                      <span className="font-semibold" style={{ color: PRIORITY_COLORS[explain.fusedScore?.priority] }}>
                        {explain.fusedScore?.priority}
                      </span>
                    </p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fusionComponents}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => `${v}%`} />
                          <Bar dataKey="value" name="Component Score" radius={[4, 4, 0, 0]}>
                            {fusionComponents.map((_entry, i) => (
                              <Cell key={i} fill={FUSION_COLORS[i % FUSION_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {fusionComponents.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-3">
                          <div className="w-28 text-xs text-right text-muted-foreground shrink-0">{c.name}</div>
                          <Progress value={c.value} className="flex-1 h-2" />
                          <div className="w-12 text-xs text-muted-foreground shrink-0">{c.value}%</div>
                          <div className="text-xs text-muted-foreground shrink-0">×{c.weight / 100}</div>
                        </div>
                      ))}
                    </div>
                    {explain.fusedScore?.reasoning && (
                      <Alert className="mt-4">
                        <AlertDescription className="text-xs">{explain.fusedScore.reasoning}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-background p-5 shadow-sm">
                    <h3 className="font-bold text-sm mb-3">Radar Overview</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={fusionComponents}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="factors" className="space-y-3 mt-4">
                  <div className="rounded-2xl border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <h3 className="font-bold text-sm">Contributing Factors</h3>
                    </div>
                    <p className="text-xs text-muted-foreground pl-9 mb-4">
                      Confidence: {Math.round((explain.explanation?.confidence ?? 0) * 100)}% · Model: {explain.explanation?.modelVersion ?? "rule-based-v1"}
                    </p>
                    <div className="space-y-3">
                      {(explain.explanation?.contributingFactors ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No contributing factors recorded for this decision.</p>
                      ) : (
                        (explain.explanation.contributingFactors as Array<{ factor: string; weight: number; description: string }>).map((f, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{f.factor}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full border font-semibold">{Math.round(f.weight * 100)}%</span>
                            </div>
                            <Progress value={f.weight * 100} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">{f.description}</p>
                          </div>
                        ))
                      )}
                      {explain.explanation?.reasoning && (
                        <Alert className="mt-4">
                          <Brain className="w-4 h-4" />
                          <AlertDescription className="text-xs ml-2">{explain.explanation.reasoning}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {(explain.recommendations ?? []).length > 0 && (
                    <div className="rounded-2xl border bg-background p-5 shadow-sm">
                      <h3 className="font-bold text-sm mb-3">AI Recommendations</h3>
                      <ul className="space-y-2">
                        {(explain.recommendations as string[]).map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="classification" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
                        label: "Urgency Level",
                        value: <span className="font-bold capitalize">{explain.urgency?.level ?? "—"}</span>,
                        progress: (explain.urgency?.score ?? 0) * 10,
                        sub: `${explain.urgency?.score?.toFixed(1) ?? "0"}/10`,
                      },
                      {
                        icon: <Shield className="w-4 h-4 text-blue-500" />,
                        label: "Intent Analysis",
                        value: <span className="font-bold text-sm">
                          {explain.intent?.isGenuineEmergency ? "Genuine Emergency" :
                           explain.intent?.isTestReport ? "Test Report" : "Casual Mention"}
                        </span>,
                        progress: null,
                        sub: `Confidence: ${Math.round((explain.intent?.confidence ?? 0) * 100)}%`,
                      },
                      {
                        icon: <Eye className="w-4 h-4 text-red-500" />,
                        label: "Fake Detection",
                        value: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${explain.fakeDetection?.isSuspicious ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"}`}>
                          {explain.fakeDetection?.isSuspicious ? "Suspicious" : "Authentic"}
                        </span>,
                        progress: explain.fakeDetection?.score ?? 0,
                        sub: `Score: ${explain.fakeDetection?.score ?? 0}/100`,
                      },
                      {
                        icon: <Zap className="w-4 h-4 text-indigo-500" />,
                        label: "Fused Priority",
                        value: <span className="font-bold" style={{ color: PRIORITY_COLORS[explain.fusedScore?.priority ?? "LOW"] }}>
                          {explain.fusedScore?.priority ?? "—"}
                        </span>,
                        progress: Math.round((explain.fusedScore?.finalScore ?? 0) * 100),
                        sub: `Score: ${Math.round((explain.fusedScore?.finalScore ?? 0) * 100)}%`,
                      },
                    ].map(({ icon, label, value, progress, sub }) => (
                      <div key={label} className="rounded-xl border bg-background p-4 shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          {icon}
                          <div>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            {value}
                          </div>
                        </div>
                        {progress !== null && <Progress value={progress} className="h-1.5" />}
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                    ))}
                  </div>

                  {(explain.fakeDetection?.reasons ?? []).length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="ml-2">
                        <strong>Fraud signals:</strong>{" "}
                        {(explain.fakeDetection.reasons as string[]).join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}

                  {(explain.urgency?.factors ?? []).length > 0 && (
                    <div className="rounded-2xl border bg-background p-4 shadow-sm">
                      <h3 className="font-bold text-sm mb-2">Urgency Factors</h3>
                      <ul className="space-y-1">
                        {(explain.urgency.factors as string[]).map((f: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="audit" className="mt-4">
                  <div className="rounded-2xl border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <h3 className="font-bold text-sm">Audit Record</h3>
                    </div>
                    <dl className="space-y-3 text-sm">
                      {[
                        { label: "Audit ID",      value: <span className="font-mono text-xs break-all">{explain.explanation?.auditId}</span> },
                        { label: "Timestamp",     value: explain.explanation?.timestamp ? new Date(explain.explanation.timestamp).toLocaleString() : "—" },
                        { label: "Report ID",     value: <span className="font-mono text-xs">{explain.reportId}</span> },
                        { label: "Model Version", value: explain.explanation?.modelVersion ?? "rule-based-v1" },
                        { label: "Decision",      value: <Badge variant={explain.explanation?.triggered ? "default" : "secondary"}>{explain.explanation?.triggered ? "Triggered" : "Not triggered"}</Badge> },
                        { label: "Confidence",    value: `${Math.round((explain.explanation?.confidence ?? 0) * 100)}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>Failed to load explanation for this decision.</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
  );
}
