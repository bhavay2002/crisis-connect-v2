/**
 * Async Pipeline Dashboard — §21
 *
 * Live observability into the async AI processing pipeline and
 * WebSocket pub/sub architecture.
 *
 * Data sources:
 *   GET /api/system/pipeline        — full pipeline health (polling 5 s)
 *   GET /api/system/pipeline/worker — worker metrics (WS-invalidated)
 *   WS  AI_ANALYSIS_COMPLETE        — triggers worker metric refresh
 */
import { useQuery } from "@tanstack/react-query";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, Brain, Radio, CheckCircle2, XCircle, Clock,
  Activity, Wifi, Database, ArrowRight, Server, Cpu,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

interface PipelineStats {
  queue: {
    depth:              number;
    processing:         number;
    concurrency:        number;
    isRunning:          boolean;
    registeredHandlers: string[];
  };
  aiWorker: {
    processed:    number;
    failed:       number;
    avgLatencyMs: number;
    successRate:  number;
    recentJobs:   Array<{ reportId: string; ms: number; score: number; at: string }>;
  };
  websocket: {
    connectedClients: number;
    rooms:            number;
    mode:             string;
  };
  pubsub: {
    mode:               "in-memory" | "redis";
    channels:           string[];
    redisReady:         boolean;
    upgradeInstructions: string | null;
  };
  architecture: {
    asyncAIPipeline:    boolean;
    multiInstanceReady: boolean;
    queueBackend:       string;
    retryStrategy:      string;
    idempotencyKey:     string;
  };
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function ms(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)  return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3600_000)}h ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-100 text-emerald-700"
              : score >= 50 ? "bg-amber-100 text-amber-700"
              :               "bg-red-100 text-red-700";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

// ── Architecture flow diagram ──────────────────────────────────────────────

const FLOW_STEPS = [
  { icon: Radio,       label: "POST /api/reports",      sub: "HTTP request",          color: "bg-blue-500" },
  { icon: Database,    label: "DB write (instant)",      sub: "aiScore = null",        color: "bg-violet-500" },
  { icon: Zap,         label: "202 Accepted",            sub: "<50 ms to client",      color: "bg-emerald-500" },
  { icon: Cpu,         label: "JobQueue worker",         sub: "concurrency: 3",        color: "bg-amber-500" },
  { icon: Brain,       label: "OpenAI analysis",         sub: "gpt-4o-mini",           color: "bg-pink-500" },
  { icon: Database,    label: "DB update",               sub: "score + notes",         color: "bg-violet-500" },
  { icon: Wifi,        label: "Pub/Sub → WS",            sub: "AI_ANALYSIS_COMPLETE",  color: "bg-sky-500" },
];

function ArchFlow() {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {FLOW_STEPS.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1 w-24">
            <div className={`w-8 h-8 rounded-full ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">{s.label}</span>
            <span className="text-[9px] text-muted-foreground text-center">{s.sub}</span>
          </div>
          {i < FLOW_STEPS.length - 1 && (
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mb-4" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AsyncPipelinePage() {
  const { data: pipeline, refetch } = useQuery<PipelineStats>({
    queryKey: ["/api/system/pipeline"],
    queryFn: () => apiRequest("/api/system/pipeline"),
    refetchInterval: 5000,
  });

  // WS-triggered refresh whenever an AI job completes
  useRealtimeMessage((msg) => {
    if (msg.type === "AI_ANALYSIS_COMPLETE" || msg.type === "AI_ANALYSIS_FAILED") {
      refetch();
    }
  });

  const q  = pipeline?.queue;
  const w  = pipeline?.aiWorker;
  const ws = pipeline?.websocket;
  const ps = pipeline?.pubsub;
  const ar = pipeline?.architecture;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Async AI Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time observability — report creation decoupled from AI processing
          </p>
        </div>
        <div className="flex gap-2">
          {ar?.asyncAIPipeline && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Async Pipeline Active
            </Badge>
          )}
          <Badge className={ps?.redisReady ? "bg-sky-100 text-sky-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
            <Server className="w-3 h-3 mr-1" />
            {ps?.mode === "redis" ? "Redis Pub/Sub" : "In-Memory Pub/Sub"}
          </Badge>
        </div>
      </div>

      {/* Architecture flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Request → AI → Client Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArchFlow />
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Queue Depth</span>
            <span className="text-3xl font-bold">{q?.depth ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{q?.processing ?? 0} processing now</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">AI Jobs Completed</span>
            <span className="text-3xl font-bold text-emerald-600">{w?.processed ?? "—"}</span>
            <span className="text-xs text-muted-foreground">{w?.failed ?? 0} failed</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Avg AI Latency</span>
            <span className="text-3xl font-bold text-violet-600">
              {w?.avgLatencyMs ? ms(w.avgLatencyMs) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">per report</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">WS Clients</span>
            <span className="text-3xl font-bold text-sky-600">{ws?.connectedClients ?? "—"}</span>
            <span className="text-xs text-muted-foreground">connected now</span>
          </CardContent>
        </Card>
      </div>

      {/* Worker health + Pub/Sub status side by side */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Worker health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-500" /> Worker Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Success rate</span>
              <span className="font-semibold">{w?.successRate ?? 100}%</span>
            </div>
            <Progress value={w?.successRate ?? 100} className="h-1.5" />

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Queue running</span>
              <Badge className={q?.isRunning ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                {q?.isRunning ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Concurrency slots</span>
              <span className="font-mono">{q?.processing ?? 0}/{q?.concurrency ?? 3}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Retry strategy</span>
              <span className="text-xs text-muted-foreground">{ar?.retryStrategy ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Idempotency key</span>
              <span className="font-mono text-xs">{ar?.idempotencyKey ?? "reportId"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pub/Sub status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-500" /> Pub/Sub Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Mode</span>
              <Badge className={ps?.redisReady ? "bg-sky-100 text-sky-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
                {ps?.mode ?? "—"}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Multi-instance ready</span>
              <span>{ar?.multiInstanceReady ? "✅ Yes (Redis)" : "⚠️ Not yet (set REDIS_URL)"}</span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Active channels</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(ps?.channels ?? []).map((ch) => (
                  <span key={ch} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                    {ch}
                  </span>
                ))}
                {(ps?.channels ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground">No active channels yet</span>
                )}
              </div>
            </div>

            {ps?.upgradeInstructions && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">
                <strong>Upgrade:</strong> {ps.upgradeInstructions}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent AI jobs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-500" /> Recent AI Analysis Jobs
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Live — refreshes on each WS event
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!w?.recentJobs || w.recentJobs.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No AI jobs processed yet.</p>
              <p className="text-xs mt-1">Submit a report to trigger the async pipeline.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {w.recentJobs.map((job, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                      {job.reportId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={job.score} />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> {ms(job.ms)}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(job.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-px bg-border rounded overflow-hidden text-sm">
            {[
              ["Metric", "Before (Sync)", "After (Async)", ""],
              ["API p50 latency", "200–800 ms", "<50 ms", "emerald"],
              ["Throughput cap", "~3 req/s", "Queue-buffered", "emerald"],
              ["AI failure impact", "Request fails", "Retry in worker", "emerald"],
              ["Scalability", "Vertical only", "Horizontal-ready*", "sky"],
            ].map(([label, before, after, color], i) => (
              <div key={i} className={`grid grid-cols-4 col-span-4 ${i === 0 ? "bg-muted font-semibold" : "bg-card"}`}>
                <div className="px-3 py-2 border-r">{label}</div>
                <div className="px-3 py-2 border-r text-muted-foreground">{before}</div>
                <div className={`px-3 py-2 border-r ${color === "emerald" ? "text-emerald-600 font-medium" : color === "sky" ? "text-sky-600 font-medium" : ""}`}>
                  {after}
                </div>
                <div className="px-3 py-2" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Set <code className="font-mono bg-muted px-1 rounded">REDIS_URL</code> to enable Redis pub/sub for multi-instance horizontal scaling
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
