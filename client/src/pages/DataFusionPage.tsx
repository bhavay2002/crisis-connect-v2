import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { LiveIndicator } from "@/components/ds/LiveIndicator";
import { Badge } from "@/components/ui/badge";
import {
  Layers, Twitter, Radio, Cloud, Cpu, FileText, ChevronDown,
  ChevronUp, Activity, TrendingUp, AlertTriangle, Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type SignalSource = "user_report" | "iot" | "social" | "news" | "weather" | "satellite";

interface Signal {
  id: string;
  source: SignalSource;
  text: string;
  location: { lat: number; lng: number; name: string };
  timestamp: string;
  confidence: number;
  disasterType?: string;
  severity?: string;
  metadata?: Record<string, unknown>;
}

interface FusionResult {
  incidentId: string;
  fusedConfidence: number;
  signals: { ai: number; social: number; weather: number; iot: number; news: number };
  explanation: string;
  signalCount: number;
  primarySignal: Signal;
  allSignals: Signal[];
}

// ── Source config ──────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<SignalSource, { label: string; icon: any; color: string; bg: string; border: string }> = {
  user_report: { label: "User Report",  icon: Activity,  color: "text-blue-400",   bg: "bg-blue-900/30",   border: "border-blue-600/30"   },
  social:      { label: "Social Media", icon: Twitter,   color: "text-sky-400",    bg: "bg-sky-900/30",    border: "border-sky-600/30"    },
  news:        { label: "News Feed",    icon: FileText,  color: "text-yellow-400", bg: "bg-yellow-900/30", border: "border-yellow-600/30" },
  weather:     { label: "Weather API",  icon: Cloud,     color: "text-purple-400", bg: "bg-purple-900/30", border: "border-purple-600/30" },
  iot:         { label: "IoT Sensors",  icon: Cpu,       color: "text-green-400",  bg: "bg-green-900/30",  border: "border-green-600/30"  },
  satellite:   { label: "Satellite",    icon: Radio,     color: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-600/30" },
};

function ConfBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={`font-bold ${color}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
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
          {Boolean(signal.metadata?.platform) && (
            <span className="text-xs text-slate-600">· {String(signal.metadata?.platform)}</span>
          )}
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
  const confBar  = conf >= 0.8 ? "bg-red-500" : conf >= 0.6 ? "bg-orange-500" : conf >= 0.4 ? "bg-yellow-500" : "bg-green-500";
  const severityColor = result.primarySignal.severity === "critical" ? "text-red-400"
    : result.primarySignal.severity === "high" ? "text-orange-400" : "text-yellow-400";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-700/50 bg-slate-900/70 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase ${severityColor}`}>
                {result.primarySignal.severity ?? "unknown"}
              </span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {result.primarySignal.disasterType?.replace(/_/g, " ") ?? "incident"}
              </Badge>
              <span className="text-xs text-slate-500">{result.signalCount} signals</span>
            </div>
            <p className="text-sm text-white font-medium truncate">
              {result.primarySignal.location.name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{result.explanation}</p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xl font-black ${confColor}`}>{Math.round(conf * 100)}%</div>
            <div className="text-xs text-slate-500">fused conf.</div>
          </div>
        </div>

        {/* Signal breakdown bars */}
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {(["ai", "social", "weather", "iot", "news"] as const).map(key => {
            const val = result.signals[key];
            const pct = Math.round(val * 100);
            return (
              <div key={key} className="text-center">
                <div className="h-12 bg-slate-800 rounded-lg relative overflow-hidden">
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 rounded-lg ${
                      key === "ai"      ? "bg-blue-500" :
                      key === "social"  ? "bg-sky-500" :
                      key === "weather" ? "bg-purple-500" :
                      key === "iot"     ? "bg-green-500" : "bg-yellow-500"
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{key}</div>
                <div className="text-xs font-bold text-slate-300">{pct}%</div>
              </div>
            );
          })}
        </div>

        {/* Source pills row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {result.allSignals.map(s => {
            const cfg = SOURCE_CONFIG[s.source];
            const Icon = cfg.icon;
            return (
              <div key={s.id} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-white/10 transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? "Collapse signals" : `Show all ${result.allSignals.length} signals`}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-white/10"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.allSignals.map(s => <SignalPill key={s.id} signal={s} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DataFusionPage() {
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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <SectionHeader
          icon={Layers}
          title="Data Fusion Engine"
          subtitle="Multi-source signal intelligence — user reports, IoT sensors, social media, news feeds, and weather alerts fused into a single confidence score"
          iconColor="text-purple-400"
          iconBg="bg-purple-900/30 border-purple-500/30"
          rightSlot={<LiveIndicator />}
        />

        {/* Architecture banner */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-4">
          <p className="text-xs font-semibold text-purple-300 mb-3">Fusion Architecture</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { label: "User Reports",  color: "text-blue-300   bg-blue-950/60   border-blue-600/40"   },
              { label: "IoT Sensors",   color: "text-green-300  bg-green-950/60  border-green-600/40"  },
              { label: "Social Media",  color: "text-sky-300    bg-sky-950/60    border-sky-600/40"    },
              { label: "News Feeds",    color: "text-yellow-300 bg-yellow-950/60 border-yellow-600/40" },
              { label: "Weather APIs",  color: "text-purple-300 bg-purple-950/60 border-purple-600/40" },
            ].map((s, i, arr) => (
              <span key={s.label} className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${s.color}`}>{s.label}</span>
                {i < arr.length - 1 && <span className="text-slate-600 text-xs">+</span>}
              </span>
            ))}
            <span className="mx-2 text-slate-600">→</span>
            <span className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/50 bg-purple-900/40 text-purple-200 font-bold shrink-0">
              Fusion Engine
            </span>
            <span className="mx-2 text-slate-600">→</span>
            <span className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-900/30 text-red-300 font-bold shrink-0">
              Fused Confidence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            confidence = AI×0.40 + social×0.20 + weather×0.20 + IoT×0.10 + news×0.10
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Incidents"  value={results.length}   icon={Activity}      iconColor="text-blue-400"   iconBg="bg-blue-900/30 border-blue-500/20" />
          <StatCard label="High Confidence"   value={highConf}         icon={TrendingUp}    iconColor="text-red-400"    iconBg="bg-red-900/30 border-red-500/20" />
          <StatCard label="Total Signals"     value={totalSignals}     icon={Layers}        iconColor="text-purple-400" iconBg="bg-purple-900/30 border-purple-500/20" />
          <StatCard label="Sources Active"    value={5}               icon={Zap}           iconColor="text-green-400"  iconBg="bg-green-900/30 border-green-500/20" />
        </div>

        {/* Source health row */}
        {stats.bySource && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(["user_report", "social", "weather", "iot", "news"] as SignalSource[]).map(src => {
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
          <h2 className="text-sm font-bold text-white mb-4">
            Live Fusion Results ({results.length} incidents, last 24h)
          </h2>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse" />
              ))
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-700">
                <Layers className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No incidents in the last 24 hours</p>
                <p className="text-xs text-slate-600 mt-1">Submit a report to see multi-source fusion in action</p>
              </div>
            ) : (
              <AnimatePresence>
                {results.map(r => <FusionCard key={r.incidentId} result={r} />)}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
