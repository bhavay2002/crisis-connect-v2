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
import DashboardLayout from "@/components/layout/DashboardLayout";
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
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8 text-indigo-600" />
              AI Explainability
            </h1>
            <p className="text-muted-foreground mt-1">
              Audit trail for every AI decision — contributing factors, signal fusion weights, and decision reasoning
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {decisionsData?.total ?? 0} decisions logged
          </Badge>
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

                <TabsContent value="fusion" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        Signal Fusion Breakdown
                      </CardTitle>
                      <CardDescription>
                        Final score: {Math.round((explain.fusedScore?.finalScore ?? 0) * 100)}% →
                        Priority: <span className="font-semibold" style={{ color: PRIORITY_COLORS[explain.fusedScore?.priority] }}>
                          {explain.fusedScore?.priority}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                            <Progress value={c.value} className="flex-1 h-2" style={{ accentColor: FUSION_COLORS[i] }} />
                            <div className="w-12 text-xs text-muted-foreground shrink-0">{c.value}%</div>
                            <div className="text-xs text-muted-foreground shrink-0">×{c.weight / 100} weight</div>
                          </div>
                        ))}
                      </div>

                      {explain.fusedScore?.reasoning && (
                        <Alert className="mt-4">
                          <AlertDescription className="text-xs">{explain.fusedScore.reasoning}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Radar Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="factors" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500" />
                        Contributing Factors
                      </CardTitle>
                      <CardDescription>
                        Confidence: {Math.round((explain.explanation?.confidence ?? 0) * 100)}% ·
                        Model: {explain.explanation?.modelVersion ?? "rule-based-v1"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(explain.explanation?.contributingFactors ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No contributing factors recorded for this decision.</p>
                      ) : (
                        (explain.explanation.contributingFactors as Array<{ factor: string; weight: number; description: string }>).map((f, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{f.factor}</span>
                              <Badge variant="outline">{Math.round(f.weight * 100)}%</Badge>
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
                    </CardContent>
                  </Card>

                  {(explain.recommendations ?? []).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">AI Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {(explain.recommendations as string[]).map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="classification" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Urgency Level</p>
                            <p className="font-bold capitalize">{explain.urgency?.level ?? "—"}</p>
                          </div>
                        </div>
                        <Progress value={(explain.urgency?.score ?? 0) * 10} className="h-2" />
                        <p className="text-xs text-muted-foreground">{explain.urgency?.score?.toFixed(1) ?? "0"}/10</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Intent Analysis</p>
                            <p className="font-bold text-sm">
                              {explain.intent?.isGenuineEmergency ? "Genuine Emergency" :
                               explain.intent?.isTestReport ? "Test Report" : "Casual Mention"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {Math.round((explain.intent?.confidence ?? 0) * 100)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Eye className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Fake Detection</p>
                            <Badge
                              variant={explain.fakeDetection?.isSuspicious ? "destructive" : "secondary"}
                              className="mt-1"
                            >
                              {explain.fakeDetection?.isSuspicious ? "Suspicious" : "Authentic"}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={explain.fakeDetection?.score ?? 0} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">Score: {explain.fakeDetection?.score ?? 0}/100</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-indigo-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Fused Priority</p>
                            <p
                              className="font-bold"
                              style={{ color: PRIORITY_COLORS[explain.fusedScore?.priority ?? "LOW"] }}
                            >
                              {explain.fusedScore?.priority ?? "—"}
                            </p>
                          </div>
                        </div>
                        <Progress value={Math.round((explain.fusedScore?.finalScore ?? 0) * 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Score: {Math.round((explain.fusedScore?.finalScore ?? 0) * 100)}%
                        </p>
                      </CardContent>
                    </Card>
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
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Urgency Factors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {(explain.urgency.factors as string[]).map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="audit" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        Audit Record
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-3 text-sm">
                        <div className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">Audit ID</dt>
                          <dd className="font-mono text-xs break-all">{explain.explanation?.auditId}</dd>
                        </div>
                        <div className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">Timestamp</dt>
                          <dd>{explain.explanation?.timestamp ? new Date(explain.explanation.timestamp).toLocaleString() : "—"}</dd>
                        </div>
                        <div className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">Report ID</dt>
                          <dd className="font-mono text-xs">{explain.reportId}</dd>
                        </div>
                        <div className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">Model Version</dt>
                          <dd>{explain.explanation?.modelVersion ?? "rule-based-v1"}</dd>
                        </div>
                        <div className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">Decision</dt>
                          <dd>
                            <Badge variant={explain.explanation?.triggered ? "default" : "secondary"}>
                              {explain.explanation?.triggered ? "Triggered" : "Not triggered"}
                            </Badge>
                          </dd>
                        </div>
                        <div className="flex gap-4">
                          <dt className="w-32 text-muted-foreground shrink-0">Confidence</dt>
                          <dd>{Math.round((explain.explanation?.confidence ?? 0) * 100)}%</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
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
    </DashboardLayout>
  );
}
