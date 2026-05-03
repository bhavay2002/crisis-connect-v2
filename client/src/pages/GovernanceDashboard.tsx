import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { MOTION } from "@/lib/motion";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { LiveIndicator } from "@/components/ds/LiveIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, Brain, CheckCircle, XCircle, AlertTriangle,
  Clock, User, ChevronDown, ChevronUp, Eye, GitBranch,
  ArrowRight, Filter, Activity, Gauge,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Decision {
  id: string;
  reportId: string;
  decisionType: string;
  status: string;
  confidence: number;
  autoExecutable: boolean;
  reasoning: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  report?: { title: string; severity: string; location: string };
}

interface AIOverride {
  id: string;
  reportId: string;
  aiDecision: string;
  humanAction: string;
  finalDecision?: string;
  reviewNotes?: string;
  confidence?: number;
  urgencyScore?: number;
  requiresHumanReview: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  report?: { title: string; severity: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; icon: any; bg: string }> = {
  PENDING:   { color: "text-yellow-400", icon: Clock,        bg: "bg-yellow-950/40 border-yellow-600/30" },
  APPROVED:  { color: "text-green-400",  icon: CheckCircle,  bg: "bg-green-950/40 border-green-600/30"  },
  REJECTED:  { color: "text-red-400",    icon: XCircle,      bg: "bg-red-950/40 border-red-600/30"      },
  EXECUTED:  { color: "text-blue-400",   icon: Activity,     bg: "bg-blue-950/40 border-blue-600/30"    },
  EXPIRED:   { color: "text-slate-400",  icon: Clock,        bg: "bg-slate-800/40 border-slate-600/30"  },
};

const TYPE_COLORS: Record<string, string> = {
  DISPATCH:  "text-red-400 bg-red-950/50 border-red-600/30",
  ESCALATE:  "text-orange-400 bg-orange-950/50 border-orange-600/30",
  BROADCAST: "text-yellow-400 bg-yellow-950/50 border-yellow-600/30",
  PREDEPLOY: "text-blue-400 bg-blue-950/50 border-blue-600/30",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-xs font-mono ${color.replace("bg-", "text-").replace("-500", "-400")}`}>
        {pct}%
      </span>
    </div>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const typeColor = TYPE_COLORS[d.decisionType] ?? "text-slate-400 bg-slate-800 border-slate-600";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${cfg.bg} overflow-hidden`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeColor}`}>
              {d.decisionType}
            </span>
            <span className="text-sm text-slate-200 truncate">
              {d.report?.title ?? `Report ${d.reportId.slice(-6)}`}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <ConfidenceBar value={d.confidence} />
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {new Date(d.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-2 text-sm">
              {d.reasoning && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">AI Reasoning</p>
                  <p className="text-slate-300 leading-relaxed">{d.reasoning}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {d.approvedBy && (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    Approved · {d.approvedAt ? new Date(d.approvedAt).toLocaleTimeString() : "—"}
                  </div>
                )}
                {d.rejectedBy && (
                  <div className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-3 h-3" />
                    Rejected: {d.rejectionReason ?? "—"}
                  </div>
                )}
                <div className="text-slate-500">
                  Auto-exec: {d.autoExecutable ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OverrideRow({ o }: { o: AIOverride }) {
  const [open, setOpen] = useState(false);
  const isOverride = o.humanAction === "override";
  const isApprove = o.humanAction === "approved";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o2 => !o2)}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${isOverride ? "bg-red-500" : isApprove ? "bg-green-500" : "bg-yellow-500"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              isOverride
                ? "text-red-400 bg-red-950/50 border-red-600/30"
                : "text-green-400 bg-green-950/50 border-green-600/30"
            }`}>
              {(o.humanAction ?? "reviewed").toUpperCase()}
            </span>
            <span className="text-sm text-slate-200 truncate">
              {o.report?.title ?? `Report ${o.reportId?.slice(-6)}`}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <User className="w-3 h-3" />
            <span>{o.reviewedAt ? new Date(o.reviewedAt).toLocaleTimeString() : "Pending"}</span>
            {o.confidence && (
              <span>· Conf: {Math.round((o.confidence ?? 0) * 100)}%</span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">AI Original</p>
                  <p className="text-slate-300">{o.aiDecision ?? "—"}</p>
                </div>
                {o.finalDecision && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Final Decision</p>
                    <p className="text-slate-300">{o.finalDecision}</p>
                  </div>
                )}
              </div>
              {o.reviewNotes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Review Notes</p>
                  <p className="text-slate-300 text-xs">{o.reviewNotes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function GovernanceDashboard() {
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");

  const { data: decisionsData } = useQuery({
    queryKey: ["decisions", decisionFilter],
    queryFn: () =>
      apiRequest(`/api/decisions${decisionFilter !== "ALL" ? `?status=${decisionFilter}` : ""}`),
    refetchInterval: 20_000,
  });

  const { data: decisionStats } = useQuery({
    queryKey: ["decisions-stats"],
    queryFn: () => apiRequest("/api/decisions/stats"),
    refetchInterval: 30_000,
  });

  const { data: overrideStats } = useQuery({
    queryKey: ["override-stats"],
    queryFn: () => apiRequest("/api/ai-overrides/stats/summary"),
    refetchInterval: 30_000,
  });

  const { data: overridesData } = useQuery({
    queryKey: ["ai-overrides-list"],
    queryFn: () => apiRequest("/api/ai-overrides"),
    refetchInterval: 20_000,
  });

  const decisions: Decision[] = decisionsData?.decisions ?? [];
  const overrides: AIOverride[] = overridesData?.overrides ?? overridesData ?? [];

  const pendingDecisions = decisions.filter(d => d.status === "PENDING").length;
  const overrideRate = overrideStats?.overrideRate ?? 0;
  const avgConf = decisionStats?.avgConfidence ?? 0;
  const totalDecisions = decisionStats?.total ?? 0;

  const FILTER_TABS = ["ALL", "PENDING", "APPROVED", "REJECTED", "EXECUTED"];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <SectionHeader
          icon={Shield}
          title="AI Governance"
          subtitle="Human-in-the-Loop Control Center — every AI decision, human intervention, and audit log in one place"
          iconColor="text-purple-400"
          iconBg="bg-purple-900/30 border-purple-500/30"
          rightSlot={<LiveIndicator />}
        />

        {/* Governance Rule Banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-900/40 border border-amber-500/30 shrink-0">
              <Gauge className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Active Governance Rule</p>
              <div className="flex items-center gap-2 flex-wrap text-sm text-slate-300">
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-xs">
                  confidence &lt; 0.75
                </span>
                <span className="text-slate-500">OR</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-xs">
                  severity === "critical"
                </span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-semibold">Requires human approval</span>
              </div>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { label: "AI Decision", color: "bg-blue-900/60 border-blue-500/40 text-blue-300" },
              { label: "Confidence Check", color: "bg-yellow-900/60 border-yellow-500/40 text-yellow-300" },
              { label: "Threshold Gate", color: "bg-amber-900/60 border-amber-500/40 text-amber-300" },
              { label: "Human Review", color: "bg-purple-900/60 border-purple-500/40 text-purple-300" },
              { label: "Final Action", color: "bg-green-900/60 border-green-500/40 text-green-300" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2 shrink-0">
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${step.color}`}>
                  {step.label}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total AI Decisions"
            value={totalDecisions}
            icon={Brain}
            iconColor="text-blue-400"
            iconBg="bg-blue-900/30 border-blue-500/20"
          />
          <StatCard
            label="Pending Review"
            value={pendingDecisions}
            icon={Clock}
            iconColor={pendingDecisions > 0 ? "text-yellow-400" : "text-green-400"}
            iconBg={pendingDecisions > 0 ? "bg-yellow-900/30 border-yellow-500/20" : "bg-green-900/30 border-green-500/20"}
            trend={pendingDecisions > 0 ? "need attention" : undefined}
          />
          <StatCard
            label="Override Rate"
            value={`${Math.round(overrideRate * 100)}%`}
            icon={GitBranch}
            iconColor="text-orange-400"
            iconBg="bg-orange-900/30 border-orange-500/20"
          />
          <StatCard
            label="Avg Confidence"
            value={`${Math.round(avgConf * 100)}%`}
            icon={Gauge}
            iconColor={avgConf >= 0.75 ? "text-green-400" : "text-yellow-400"}
            iconBg={avgConf >= 0.75 ? "bg-green-900/30 border-green-500/20" : "bg-yellow-900/30 border-yellow-500/20"}
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Left — AI Decisions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">AI Decision Log</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-slate-500" />
                <div className="flex gap-1">
                  {FILTER_TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDecisionFilter(tab)}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                        decisionFilter === tab
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                      }`}
                    >
                      {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {decisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Brain className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">No decisions match this filter</p>
                  <p className="text-xs text-slate-600 mt-1">Submit a report to trigger the Decision Engine</p>
                </div>
              ) : (
                <AnimatePresence>
                  {decisions.map(d => <DecisionRow key={d.id} d={d} />)}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Right — Human Interventions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">Human Intervention Audit</h2>
              </div>
              <div className="flex items-center gap-2">
                {overrideStats?.pendingReview > 0 && (
                  <Badge className="bg-yellow-600 text-white text-xs">
                    {overrideStats.pendingReview} pending
                  </Badge>
                )}
              </div>
            </div>

            {/* Override breakdown */}
            {overrideStats && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Auto-Approved", value: overrideStats.autoApproved ?? 0, color: "text-green-400" },
                  { label: "Overridden",    value: overrideStats.overridden ?? 0,   color: "text-red-400"   },
                  { label: "Pending",       value: overrideStats.pendingReview ?? 0, color: "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-2.5 text-center">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[420px] pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {overrides.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Shield className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">No human interventions yet</p>
                  <p className="text-xs text-slate-600 mt-1">Interventions appear when humans approve or override AI decisions</p>
                </div>
              ) : (
                <AnimatePresence>
                  {overrides.slice(0, 30).map(o => <OverrideRow key={o.id} o={o} />)}
                </AnimatePresence>
              )}
            </div>

            <div className="pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
                onClick={() => window.location.href = "/ai-override"}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Full AI Override Console
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
