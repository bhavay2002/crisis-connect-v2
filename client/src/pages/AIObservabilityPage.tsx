/**
 * AI Observability — unified platform observability center.
 * Audience: Engineers, Platform Operators
 *
 * Tabs:
 *  1. Pipelines       — AsyncPipelinePage (queue, worker, pub/sub, recent jobs)
 *  2. Models          — MultimodalPage (text/voice/image inference playground)
 *  3. Fusion Sources  — DataFusionPage (multi-source signal intelligence)
 *  4. Inference Health — AI-specific KPIs + circuit breakers from MonitoringPage
 *  5. System Health   — Full system health, Prometheus, checks
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { LiveIndicator } from "@/components/ds/LiveIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Cpu, AlertTriangle, CheckCircle, Clock, Zap,
  Database, RefreshCw, Wifi, TrendingUp, Server,
  Layers, Twitter, Radio, Cloud, FileText, ChevronDown, ChevronUp,
  Brain, Mic, Image, CheckCircle2, XCircle, ArrowRight,
  Eye, BarChart3, GitBranch, Gauge, Shield,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SignalSource = "user_report" | "iot" | "social" | "news" | "weather" | "satellite";

interface Signal {
  id: string; source: SignalSource; text: string;
  location: { lat: number; lng: number; name: string };
  timestamp: string; confidence: number; disasterType?: string;
  severity?: string; metadata?: Record<string, unknown>;
}
interface FusionResult {
  incidentId: string; fusedConfidence: number;
  signals: { ai: number; social: number; weather: number; iot: number; news: number };
  explanation: string; signalCount: number; primarySignal: Signal; allSignals: Signal[];
}
interface MultimodalResult {
  crisisType: string; urgency: number; confidence: number; severity: string;
  explanation: string; fusionScores: { text: number; voice: number; image: number };
  fusedScore: number; requiresHumanReview: boolean; source: string;
}
interface MonitoringStats {
  platform: { totalReports: number; totalSOS: number; totalUsers: number };
  runtime: {
    totalRequests: number; errorRate: number; avgResponseTimeMs: number;
    p95ResponseTimeMs: number; requestsPerMinute: number; activeConnections: number; uptimeSeconds: number;
  };
  circuitBreakers: { name: string; state: string; failureCount: number; lastFailureAt: number | null }[];
}
interface HealthDetailed {
  status: string;
  checks: Record<string, { status: string; detail?: string }>;
  uptime: number;
}
interface PipelineStats {
  queue: { depth: number; processing: number; concurrency: number; isRunning: boolean; registeredHandlers: string[] };
  aiWorker: { processed: number; failed: number; avgLatencyMs: number; successRate: number; recentJobs: Array<{ reportId: string; ms: number; score: number; at: string }> };
  websocket: { connectedClients: number; rooms: number; mode: string };
  pubsub: { mode: "in-memory" | "redis"; channels: string[]; redisReady: boolean; upgradeInstructions: string | null };
  architecture: { asyncAIPipeline: boolean; multiInstanceReady: boolean; queueBackend: string; retryStrategy: string; idempotencyKey: string };
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants / configs
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<SignalSource, { label: string; icon: any; color: string; bg: string; border: string }> = {
  user_report: { label: "User Report",  icon: Activity, color: "text-blue-400",   bg: "bg-blue-900/30",   border: "border-blue-600/30"   },
  social:      { label: "Social Media", icon: Twitter,  color: "text-sky-400",    bg: "bg-sky-900/30",    border: "border-sky-600/30"    },
  news:        { label: "News Feed",    icon: FileText, color: "text-yellow-400", bg: "bg-yellow-900/30", border: "border-yellow-600/30" },
  weather:     { label: "Weather API",  icon: Cloud,    color: "text-purple-400", bg: "bg-purple-900/30", border: "border-purple-600/30" },
  iot:         { label: "IoT Sensors",  icon: Cpu,      color: "text-green-400",  bg: "bg-green-900/30",  border: "border-green-600/30"  },
  satellite:   { label: "Satellite",    icon: Radio,    color: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-600/30" },
};

const STATUS_COLORS: Record<string, string> = {
  ok:        "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  degraded:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  down:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  CLOSED:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  OPEN:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  HALF_OPEN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};

const SEV_CFG: Record<string, string> = {
  low:      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  medium:   "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
  high:     "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
};

const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
const uptimeFmt = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
const msLabel = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`;
const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3600_000)}h ago`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ConfBar({ label, value, color }: { label: string; value: number; color: string }) {
  const p = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={`font-bold ${color}`}>{p}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${color.replace("text-", "bg-")}`} initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
      </div>
    </div>
  );
}

function SignalPill({ signal }: { signal: Signal }) {
  const cfg = SOURCE_CONFIG[signal.source] ?? SOURCE_CONFIG.user_report;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${cfg.border} ${cfg.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${cfg.color} mt-0.5 shrink-0`} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-slate-500">{Math.round(signal.confidence * 100)}%</span>
          {Boolean(signal.metadata?.platform) && <span className="text-xs text-slate-600">· {String(signal.metadata?.platform)}</span>}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{signal.text}</p>
      </div>
    </div>
  );
}

function FusionCard({ result }: { result: FusionResult }) {
  const [open, setOpen] = useState(false);
  const conf = result.fusedConfidence;
  const confColor = conf >= 0.8 ? "text-red-400" : conf >= 0.6 ? "text-orange-400" : conf >= 0.4 ? "text-yellow-400" : "text-green-400";
  const severityColor = result.primarySignal.severity === "critical" ? "text-red-400" : result.primarySignal.severity === "high" ? "text-orange-400" : "text-yellow-400";
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-700/50 bg-slate-900/70 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase ${severityColor}`}>{result.primarySignal.severity ?? "unknown"}</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">{result.primarySignal.disasterType?.replace(/_/g," ") ?? "incident"}</Badge>
              <span className="text-xs text-slate-500">{result.signalCount} signals</span>
            </div>
            <p className="text-sm text-white font-medium truncate">{result.primarySignal.location.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{result.explanation}</p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xl font-black ${confColor}`}>{Math.round(conf * 100)}%</div>
            <div className="text-xs text-slate-500">fused conf.</div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {(["ai","social","weather","iot","news"] as const).map(key => {
            const val = result.signals[key];
            const p = Math.round(val * 100);
            return (
              <div key={key} className="text-center">
                <div className="h-12 bg-slate-800 rounded-lg relative overflow-hidden">
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 rounded-lg ${key==="ai" ? "bg-blue-500" : key==="social" ? "bg-sky-500" : key==="weather" ? "bg-purple-500" : key==="iot" ? "bg-green-500" : "bg-yellow-500"}`}
                    initial={{ height: 0 }} animate={{ height: `${p}%` }} transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{key}</div>
                <div className="text-xs font-bold text-slate-300">{p}%</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {result.allSignals.map(s => {
            const cfg = SOURCE_CONFIG[s.source];
            const Icon = cfg.icon;
            return (
              <div key={s.id} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color}`}>
                <Icon className="w-3 h-3" />{cfg.label}
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-white/10 transition-colors">
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? "Collapse signals" : `Show all ${result.allSignals.length} signals`}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="border-t border-white/10">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.allSignals.map(s => <SignalPill key={s.id} signal={s} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

const FLOW_STEPS = [
  { icon: Radio,    label: "POST /api/reports",  sub: "HTTP request",         color: "bg-blue-500"   },
  { icon: Database, label: "DB write (instant)",  sub: "aiScore = null",       color: "bg-violet-500" },
  { icon: Zap,      label: "202 Accepted",        sub: "<50 ms to client",     color: "bg-emerald-500"},
  { icon: Cpu,      label: "JobQueue worker",     sub: "concurrency: 3",       color: "bg-amber-500"  },
  { icon: Brain,    label: "OpenAI analysis",     sub: "gpt-4o-mini",          color: "bg-pink-500"   },
  { icon: Database, label: "DB update",           sub: "score + notes",        color: "bg-violet-500" },
  { icon: Wifi,     label: "Pub/Sub → WS",        sub: "AI_ANALYSIS_COMPLETE", color: "bg-sky-500"    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "pipelines",       label: "Pipelines",        icon: Zap       },
  { id: "models",          label: "Models",            icon: Brain     },
  { id: "fusion-sources",  label: "Fusion Sources",    icon: Layers    },
  { id: "inference-health",label: "Inference Health",  icon: Activity  },
  { id: "system-health",   label: "System Health",     icon: Server    },
] as const;

type TabId = typeof TABS[number]["id"];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AIObservabilityPage() {
  const [activeTab, setActiveTab] = useState<TabId>("pipelines");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <SectionHeader
          icon={Eye}
          title="AI Observability"
          subtitle="Pipeline telemetry, model inference, signal fusion, and system health — for engineers and platform operators"
          iconColor="text-cyan-400"
          iconBg="bg-cyan-900/30 border-cyan-500/30"
          rightSlot={<LiveIndicator />}
        />

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  active ? "bg-cyan-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "pipelines"        && <PipelinesTab />}
            {activeTab === "models"           && <ModelsTab />}
            {activeTab === "fusion-sources"   && <FusionSourcesTab />}
            {activeTab === "inference-health" && <InferenceHealthTab />}
            {activeTab === "system-health"    && <SystemHealthTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Pipelines — Async AI Pipeline observability
// ─────────────────────────────────────────────────────────────────────────────

function PipelinesTab() {
  const { data: pipeline, refetch } = useQuery<PipelineStats>({
    queryKey: ["/api/system/pipeline"],
    queryFn: () => apiRequest("/api/system/pipeline"),
    refetchInterval: 5000,
  });

  useRealtimeMessage((msg) => {
    if (msg.type === "AI_ANALYSIS_COMPLETE" || msg.type === "AI_ANALYSIS_FAILED") refetch();
  });

  const q  = pipeline?.queue;
  const w  = pipeline?.aiWorker;
  const ws = pipeline?.websocket;
  const ps = pipeline?.pubsub;
  const ar = pipeline?.architecture;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Async AI Pipeline</h2>
          <p className="text-sm text-slate-400 mt-0.5">Report creation decoupled from AI processing — real-time worker telemetry</p>
        </div>
        <div className="flex items-center gap-2">
          {ar?.asyncAIPipeline && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />Async Pipeline Active
            </Badge>
          )}
          <Badge className={ps?.redisReady ? "bg-sky-100 text-sky-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
            <Server className="w-3 h-3 mr-1" />
            {ps?.mode === "redis" ? "Redis Pub/Sub" : "In-Memory Pub/Sub"}
          </Badge>
        </div>
      </div>

      {/* Architecture flow */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Request → AI → Client Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-1">
            {FLOW_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1 w-24">
                  <div className={`w-8 h-8 rounded-full ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight text-slate-300">{s.label}</span>
                  <span className="text-[9px] text-slate-500 text-center">{s.sub}</span>
                </div>
                {i < FLOW_STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 mb-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">Queue Depth</span>
            <span className="text-3xl font-bold text-white">{q?.depth ?? "—"}</span>
            <span className="text-xs text-slate-500">{q?.processing ?? 0} processing now</span>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">AI Jobs Completed</span>
            <span className="text-3xl font-bold text-emerald-400">{w?.processed ?? "—"}</span>
            <span className="text-xs text-slate-500">{w?.failed ?? 0} failed</span>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">Avg AI Latency</span>
            <span className="text-3xl font-bold text-violet-400">{w?.avgLatencyMs ? msLabel(w.avgLatencyMs) : "—"}</span>
            <span className="text-xs text-slate-500">per report</span>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400">WS Clients</span>
            <span className="text-3xl font-bold text-sky-400">{ws?.connectedClients ?? "—"}</span>
            <span className="text-xs text-slate-500">connected now</span>
          </CardContent>
        </Card>
      </div>

      {/* Worker health + Pub/Sub */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-white"><Cpu className="w-4 h-4 text-amber-400" />Worker Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Success rate</span>
              <span className="font-semibold text-white">{w?.successRate ?? 100}%</span>
            </div>
            <Progress value={w?.successRate ?? 100} className="h-1.5" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Queue running</span>
              <Badge className={q?.isRunning ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>{q?.isRunning ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Concurrency slots</span>
              <span className="font-mono text-white">{q?.processing ?? 0}/{q?.concurrency ?? 3}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Retry strategy</span>
              <span className="text-xs text-slate-400">{ar?.retryStrategy ?? "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Idempotency key</span>
              <span className="font-mono text-xs text-slate-300">{ar?.idempotencyKey ?? "reportId"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-white"><Radio className="w-4 h-4 text-sky-400" />Pub/Sub Architecture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Mode</span>
              <Badge className={ps?.redisReady ? "bg-sky-100 text-sky-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>{ps?.mode ?? "—"}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Multi-instance ready</span>
              <span className="text-white">{ar?.multiInstanceReady ? "✅ Yes (Redis)" : "⚠️ Not yet"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Active channels</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(ps?.channels ?? []).map(ch => <span key={ch} className="text-[10px] font-mono bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-300">{ch}</span>)}
                {(ps?.channels ?? []).length === 0 && <span className="text-xs text-slate-500">No active channels yet</span>}
              </div>
            </div>
            {ps?.upgradeInstructions && (
              <div className="text-xs text-amber-400 bg-amber-950/30 rounded p-2 border border-amber-700/30">
                <strong>Upgrade:</strong> {ps.upgradeInstructions}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent AI jobs */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-white">
            <Activity className="w-4 h-4 text-pink-400" />Recent AI Analysis Jobs
            <span className="ml-auto text-xs font-normal text-slate-500">Live — refreshes on each WS event</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!w?.recentJobs || w.recentJobs.length === 0) ? (
            <div className="text-center py-8 text-slate-500">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No AI jobs processed yet.</p>
              <p className="text-xs mt-1">Submit a report to trigger the async pipeline.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {w.recentJobs.map((job, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-mono text-xs text-slate-400 truncate max-w-[180px]">{job.reportId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={job.score} />
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />{msLabel(job.ms)}</span>
                    <span className="text-xs text-slate-500">{timeAgo(job.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance comparison */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Performance Impact</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-xl overflow-hidden border border-slate-700 text-sm">
            {[
              ["Metric", "Before (Sync)", "After (Async)", ""],
              ["API p50 latency", "200–800 ms", "<50 ms", "emerald"],
              ["Throughput cap", "~3 req/s", "Queue-buffered", "emerald"],
              ["AI failure impact", "Request fails", "Retry in worker", "emerald"],
              ["Scalability", "Vertical only", "Horizontal-ready*", "sky"],
            ].map(([label, before, after, color], i) => (
              <div key={i} className={`grid grid-cols-3 ${i === 0 ? "bg-slate-800 font-semibold text-slate-300" : "bg-slate-900/40 text-slate-400 hover:bg-slate-800/40"}`}>
                <div className="px-3 py-2 border-r border-slate-700">{label}</div>
                <div className="px-3 py-2 border-r border-slate-700">{before}</div>
                <div className={`px-3 py-2 ${color === "emerald" ? "text-emerald-400 font-medium" : color === "sky" ? "text-sky-400 font-medium" : ""}`}>{after}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">* Set <code className="font-mono bg-slate-800 px-1 rounded">REDIS_URL</code> to enable Redis pub/sub for multi-instance horizontal scaling</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Models — Multimodal inference playground
// ─────────────────────────────────────────────────────────────────────────────

const DEMOS = [
  { label: "🌊 Flood",      text: "Streets completely flooded, cars submerged, water level rising fast", voice: "Help, water is chest deep, I am on roof, please send boats" },
  { label: "🔥 Fire",       text: "Massive fire engulfing industrial factory near highway overpass",     voice: "Fire everywhere, employees trapped inside, black smoke visible" },
  { label: "🏚 Earthquake", text: "Multiple buildings collapsed after strong tremors, rubble everywhere", voice: "Ground shaking violently, walls collapsing, get everyone out now" },
];

function ModelsTab() {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Multimodal AI Inference</h2>
        <p className="text-sm text-slate-400 mt-0.5">Text + Voice + Image signals fused via GPT-4o vision — 40/30/30 weighted scoring with explainable output</p>
      </div>

      {info && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Text Signal",  weight: info.fusionWeights?.text,  icon: FileText, color: "text-blue-400",   bg: "bg-blue-900/30 border-blue-600/30"   },
            { label: "Voice Signal", weight: info.fusionWeights?.voice, icon: Mic,      color: "text-green-400",  bg: "bg-green-900/30 border-green-600/30"  },
            { label: "Image Signal", weight: info.fusionWeights?.image, icon: Image,    color: "text-purple-400", bg: "bg-purple-900/30 border-purple-600/30" },
          ].map(({ label, weight, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl border ${bg} p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
              <div><p className="text-xs text-slate-400">{label}</p><p className={`text-2xl font-black ${color}`}>{Math.round(weight * 100)}%</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-4">
          <h3 className="font-bold text-sm text-white">Input Signals</h3>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5 block"><FileText className="w-3 h-3" />Text Report <span className="text-blue-400">40%</span></Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} rows={3} className="text-sm resize-none bg-slate-800 border-slate-700 text-white placeholder-slate-500" placeholder="Describe what you see: 'Building on fire near main road, people trapped on 3rd floor...'" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5 block"><Mic className="w-3 h-3" />Voice Transcript <span className="text-green-400">30%</span></Label>
            <Textarea value={voiceTranscript} onChange={e => setVoiceTranscript(e.target.value)} rows={2} className="text-sm resize-none bg-slate-800 border-slate-700 text-white placeholder-slate-500" placeholder="Paste voice-to-text transcript: 'There is heavy flooding, water is chest deep...'" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5 block"><Image className="w-3 h-3" />Image URL <span className="text-purple-400">30%</span></Label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="text-sm h-9 bg-slate-800 border-slate-700 text-white placeholder-slate-500" placeholder="https://example.com/crisis-photo.jpg" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 block">Location (optional)</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} className="text-sm h-9 bg-slate-800 border-slate-700 text-white placeholder-slate-500" placeholder="e.g. Mumbai, Zone 4" />
          </div>
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold" onClick={() => analyzeMutation.mutate()} disabled={!hasInput || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? <><Zap className="w-4 h-4 mr-2 animate-pulse" />Analyzing all signals…</> : <><Brain className="w-4 h-4 mr-2" />Run Multimodal Analysis</>}
          </Button>
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-slate-500 font-medium mb-2">Quick test scenarios</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMOS.map(s => (
                <Button key={s.label} size="sm" variant="outline" className="text-xs h-7 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => { setText(s.text); setVoiceTranscript(s.voice); }}>{s.label}</Button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
          <h3 className="font-bold text-sm text-white mb-4">Analysis Result</h3>
          {!result ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <Brain className="w-14 h-14 mb-4 opacity-15" />
              <p className="font-semibold">Awaiting analysis</p>
              <p className="text-xs mt-1.5">Provide input signals and click Analyze</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Crisis Type</p>
                  <p className="text-xl font-black text-white capitalize">{result.crisisType.replace(/_/g," ")}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-bold border uppercase ${SEV_CFG[result.severity]}`}>{result.severity}</span>
              </div>
              <div className="space-y-3">
                <ScoreBar label="Urgency"        value={result.urgency}    color="bg-red-500"    />
                <ScoreBar label="AI Confidence"  value={result.confidence} color="bg-blue-500"   />
                <ScoreBar label="Fused Score"    value={result.fusedScore} color="bg-purple-500" />
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">Signal Breakdown (Weighted)</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Text (40%)",  value: result.fusionScores.text,  color: "text-blue-400"   },
                    { label: "Voice (30%)", value: result.fusionScores.voice, color: "text-green-400"  },
                    { label: "Image (30%)", value: result.fusionScores.image, color: "text-purple-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label}><p className="text-xs text-slate-400">{label}</p><p className={`font-black text-lg ${color}`}>{(value * 100).toFixed(0)}%</p></div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5">AI Explanation</p>
                <p className="text-sm leading-relaxed text-slate-300">{result.explanation}</p>
              </div>
              {result.requiresHumanReview ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-orange-700/50 bg-orange-950/30">
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div><p className="text-xs font-bold text-orange-400">Human review required</p><p className="text-xs text-orange-500">Low confidence or critical severity — queued for admin review</p></div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-green-700/50 bg-green-950/30">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-xs font-semibold text-green-400">Auto-approved — confidence threshold met</p>
                </div>
              )}
              <p className="text-xs text-slate-500">Source: <span className="font-mono text-slate-400">{result.source === "ai" ? "GPT-4o Vision + Text" : "Heuristic fallback"}</span></p>
            </div>
          )}
        </div>
      </div>

      {info && info.humanReviewTriggers && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
          <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" />Human Review Triggers</h3>
          <div className="flex flex-wrap gap-2">
            {info.humanReviewTriggers.map((t: string, i: number) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-orange-950/40 border border-orange-700/40 text-orange-300 font-medium">{t}</span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Model: <span className="font-mono text-slate-400">{info.model}</span></p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Fusion Sources — Multi-signal data fusion
// ─────────────────────────────────────────────────────────────────────────────

function FusionSourcesTab() {
  const { data: fusionData, isLoading } = useQuery({
    queryKey: ["fusion-signals"],
    queryFn: () => apiRequest("/api/fusion/signals?limit=15"),
    refetchInterval: 30_000,
  });
  const { data: statsData } = useQuery({
    queryKey: ["fusion-stats"],
    queryFn: () => apiRequest("/api/fusion/stats"),
    refetchInterval: 60_000,
  });

  const results: FusionResult[] = fusionData?.results ?? [];
  const stats = statsData ?? {};
  const highConf = results.filter(r => r.fusedConfidence >= 0.7).length;
  const totalSignals = results.reduce((s, r) => s + r.signalCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Data Fusion Engine</h2>
        <p className="text-sm text-slate-400 mt-0.5">Multi-source signal intelligence — user reports, IoT, social, news, and weather fused into a single confidence score</p>
      </div>

      {/* Architecture banner */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-4">
        <p className="text-xs font-semibold text-purple-300 mb-3">Fusion Architecture</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: "User Reports", color: "text-blue-300 bg-blue-950/60 border-blue-600/40"    },
            { label: "IoT Sensors",  color: "text-green-300 bg-green-950/60 border-green-600/40" },
            { label: "Social Media", color: "text-sky-300 bg-sky-950/60 border-sky-600/40"       },
            { label: "News Feeds",   color: "text-yellow-300 bg-yellow-950/60 border-yellow-600/40"},
            { label: "Weather APIs", color: "text-purple-300 bg-purple-950/60 border-purple-600/40"},
          ].map((s, i, arr) => (
            <span key={s.label} className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${s.color}`}>{s.label}</span>
              {i < arr.length - 1 && <span className="text-slate-600 text-xs">+</span>}
            </span>
          ))}
          <span className="mx-2 text-slate-600">→</span>
          <span className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/50 bg-purple-900/40 text-purple-200 font-bold shrink-0">Fusion Engine</span>
          <span className="mx-2 text-slate-600">→</span>
          <span className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-900/30 text-red-300 font-bold shrink-0">Fused Confidence</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">confidence = AI×0.40 + social×0.20 + weather×0.20 + IoT×0.10 + news×0.10</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Incidents" value={results.length}  icon={Activity}   iconColor="text-blue-400"   iconBg="bg-blue-900/30 border-blue-500/20"   />
        <StatCard label="High Confidence"  value={highConf}        icon={TrendingUp}  iconColor="text-red-400"    iconBg="bg-red-900/30 border-red-500/20"     />
        <StatCard label="Total Signals"    value={totalSignals}    icon={Layers}      iconColor="text-purple-400" iconBg="bg-purple-900/30 border-purple-500/20"/>
        <StatCard label="Sources Active"   value={5}               icon={Zap}         iconColor="text-green-400"  iconBg="bg-green-900/30 border-green-500/20" />
      </div>

      {/* Source health grid */}
      {stats.bySource && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["user_report","social","weather","iot","news"] as SignalSource[]).map(src => {
            const cfg = SOURCE_CONFIG[src];
            const Icon = cfg.icon;
            const count = stats.bySource[src] ?? 0;
            return (
              <div key={src} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 text-center`}>
                <Icon className={`w-5 h-5 ${cfg.color} mx-auto mb-1.5`} />
                <div className={`text-lg font-bold ${cfg.color}`}>{count}</div>
                <div className="text-xs text-slate-500">{cfg.label}</div>
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">live</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fusion results */}
      <div>
        <h3 className="text-sm font-bold text-white mb-4">Live Fusion Results ({results.length} incidents, last 24h)</h3>
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse" />)
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-700">
              <Layers className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No incidents in the last 24 hours</p>
              <p className="text-xs text-slate-600 mt-1">Submit a report to see multi-source fusion in action</p>
            </div>
          ) : (
            <AnimatePresence>{results.map(r => <FusionCard key={r.incidentId} result={r} />)}</AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Inference Health — AI-specific metrics
// ─────────────────────────────────────────────────────────────────────────────

function InferenceHealthTab() {
  const qc = useQueryClient();
  const { data: stats } = useQuery<MonitoringStats>({ queryKey: ["/api/monitoring/stats"], refetchInterval: 15_000 });
  const { data: alertsData } = useQuery<{ alerts: { level: string; message: string }[] }>({ queryKey: ["/api/monitoring/alerts"], refetchInterval: 30_000 });

  const rt = stats?.runtime;
  const activeAlerts = alertsData?.alerts?.filter(a => a.level !== "info") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Inference Health</h2>
          <p className="text-sm text-slate-400 mt-0.5">Runtime metrics, circuit breakers, and AI performance indicators</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => { qc.invalidateQueries({ queryKey: ["/api/monitoring/stats"] }); qc.invalidateQueries({ queryKey: ["/api/monitoring/alerts"] }); }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      {/* Alert banners */}
      {activeAlerts.map((al, i) => (
        <div key={i} className={`relative overflow-hidden rounded-xl border p-4 ${al.level === "critical" ? "border-red-500/30 bg-red-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${al.level === "critical" ? "bg-red-500" : "bg-yellow-500"}`} />
          <div className="flex items-center gap-3 pl-3">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${al.level === "critical" ? "text-red-500" : "text-yellow-500"}`} />
            <p className={`text-sm font-semibold ${al.level === "critical" ? "text-red-400" : "text-yellow-400"}`}>{al.message}</p>
          </div>
        </div>
      ))}

      {/* AI KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Error Rate",   value: `${rt?.errorRate?.toFixed(1) || 0}%`, sub: "last window",               icon: AlertTriangle, color: rt?.errorRate && rt.errorRate > 5 ? "text-red-400" : "text-green-400",    bg: rt?.errorRate && rt.errorRate > 5 ? "bg-red-900/30"  : "bg-green-900/30"  },
          { label: "Avg Response", value: `${rt?.avgResponseTimeMs || 0}ms`,    sub: `P95: ${rt?.p95ResponseTimeMs || 0}ms`, icon: Clock,       color: "text-purple-400",  bg: "bg-purple-900/30" },
          { label: "Req / min",    value: rt?.requestsPerMinute || 0,           sub: "last minute",              icon: Zap,           color: "text-orange-400",  bg: "bg-orange-900/30" },
          { label: "Connections",  value: rt?.activeConnections || 0,           sub: "active right now",         icon: Wifi,          color: "text-sky-400",     bg: "bg-sky-900/30"    },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border border-slate-700/60 ${bg} p-4`}>
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-xl font-black mt-0.5 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Circuit breakers */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" />Circuit Breakers</h3>
        {(!stats?.circuitBreakers || stats.circuitBreakers.length === 0) ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <Wifi className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="font-semibold text-slate-400">No circuit breakers registered</p>
            <p className="text-xs text-slate-500 mt-1">They activate when external integrations are first called</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.circuitBreakers.map((cb) => (
              <div key={cb.name} className={`flex items-center justify-between p-3.5 rounded-xl border bg-slate-900 ${cb.state === "OPEN" ? "border-red-700/50" : "border-slate-700/50"}`}>
                <div>
                  <p className="font-semibold text-sm text-white">{cb.name}</p>
                  <p className="text-xs text-slate-500">Failures: {cb.failureCount}{cb.lastFailureAt ? ` · Last: ${new Date(cb.lastFailureAt).toLocaleTimeString()}` : ""}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[cb.state]}`}>{cb.state}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Reports",    value: fmtNum(stats?.platform.totalReports || 0), icon: Database, color: "text-indigo-400", bg: "bg-indigo-900/30" },
          { label: "SOS Alerts",       value: fmtNum(stats?.platform.totalSOS || 0),     icon: Wifi,     color: "text-red-400",    bg: "bg-red-900/30"    },
          { label: "Registered Users", value: fmtNum(stats?.platform.totalUsers || 0),   icon: Cpu,      color: "text-teal-400",   bg: "bg-teal-900/30"   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border border-slate-700/60 ${bg} p-4`}>
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: System Health — Full health checks + Prometheus
// ─────────────────────────────────────────────────────────────────────────────

function SystemHealthTab() {
  const qc = useQueryClient();
  const { data: stats } = useQuery<MonitoringStats>({ queryKey: ["/api/monitoring/stats"], refetchInterval: 15_000 });
  const { data: health } = useQuery<HealthDetailed>({ queryKey: ["/api/health/detailed"], refetchInterval: 30_000 });
  const rt = stats?.runtime;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">System Health</h2>
          <p className="text-sm text-slate-400 mt-0.5">Health checks, uptime, request throughput, and Prometheus metrics</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => { qc.invalidateQueries({ queryKey: ["/api/monitoring/stats"] }); qc.invalidateQueries({ queryKey: ["/api/health/detailed"] }); }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      {/* Overall status */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-700/60 bg-slate-900/60">
        <Server className="w-5 h-5 text-slate-400" />
        <span className="text-sm font-semibold text-white">System Status</span>
        {health && <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[health.status]}`}>{health.status}</span>}
        <span className="ml-auto text-xs text-slate-500">Uptime: <span className="font-mono text-slate-300">{uptimeFmt(rt?.uptimeSeconds || 0)}</span></span>
      </div>

      {/* Full KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Requests", value: fmtNum(rt?.totalRequests || 0),         sub: "all time",               icon: TrendingUp, color: "text-blue-400",   bg: "bg-blue-900/30"   },
          { label: "Error Rate",     value: `${rt?.errorRate?.toFixed(1) || 0}%`,   sub: "last window",            icon: AlertTriangle, color: rt?.errorRate && rt.errorRate > 5 ? "text-red-400" : "text-green-400", bg: rt?.errorRate && rt.errorRate > 5 ? "bg-red-900/30" : "bg-green-900/30" },
          { label: "Avg Response",   value: `${rt?.avgResponseTimeMs || 0}ms`,      sub: `P95: ${rt?.p95ResponseTimeMs || 0}ms`, icon: Clock, color: "text-purple-400", bg: "bg-purple-900/30" },
          { label: "Req / min",      value: rt?.requestsPerMinute || 0,             sub: "last minute",            icon: Zap,        color: "text-orange-400", bg: "bg-orange-900/30" },
          { label: "Total Reports",  value: fmtNum(stats?.platform.totalReports || 0), sub: "crisis reports",      icon: Database,   color: "text-indigo-400", bg: "bg-indigo-900/30" },
          { label: "SOS Alerts",     value: fmtNum(stats?.platform.totalSOS || 0), sub: "all time",               icon: Wifi,       color: "text-red-400",    bg: "bg-red-900/30"    },
          { label: "Reg. Users",     value: fmtNum(stats?.platform.totalUsers || 0), sub: "platform users",       icon: Cpu,        color: "text-teal-400",   bg: "bg-teal-900/30"   },
          { label: "Uptime",         value: uptimeFmt(rt?.uptimeSeconds || 0),      sub: "process uptime",         icon: CheckCircle,color: "text-green-400",  bg: "bg-green-900/30"  },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border border-slate-700/40 ${bg} p-4`}>
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-xl font-black mt-0.5 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Health checks */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />Health Checks</h3>
        {health?.checks && Object.entries(health.checks).map(([name, check]) => (
          <div key={name} className={`flex items-center justify-between p-3.5 rounded-xl border bg-slate-900 ${check.status === "down" ? "border-red-700/50" : check.status === "degraded" ? "border-yellow-700/50" : "border-slate-700/40"}`}>
            <div>
              <p className="font-semibold text-sm text-white capitalize">{name.replace(/([A-Z])/g," $1")}</p>
              {check.detail && <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[check.status]}`}>{check.status}</span>
          </div>
        ))}
      </div>

      {/* Prometheus */}
      <PrometheusPanel />
    </div>
  );
}

function PrometheusPanel() {
  const { data, isLoading, refetch } = useQuery<string>({
    queryKey: ["/api/metrics-raw"],
    queryFn: async () => { const res = await fetch("/api/metrics"); return res.text(); },
    refetchInterval: false,
  });
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-400" />Prometheus-format Metrics</p>
        <Button size="sm" variant="outline" className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</Button>
      </div>
      <pre className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 text-xs overflow-x-auto max-h-96 leading-relaxed text-slate-300 font-mono">
        {isLoading ? "Loading…" : data || "No data"}
      </pre>
    </div>
  );
}
