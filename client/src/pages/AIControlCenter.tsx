import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { LiveIndicator } from "@/components/ds/LiveIndicator";
import { AIExplainabilityPanel } from "@/components/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Brain, CheckCircle, XCircle, AlertTriangle, Clock, User,
  ChevronDown, ChevronUp, Eye, GitBranch, ArrowRight, Filter, Activity,
  Gauge, Settings, Plus, Trash2, ToggleLeft, ToggleRight, Play,
  CheckCircle2, Zap, BarChart3, RefreshCw, Info, ShieldCheck,
  UserCheck, ShieldAlert, TrendingUp, Sliders, Target, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

interface Decision {
  id: string; reportId: string; decisionType: string; status: string;
  confidence: number; autoExecutable: boolean; reasoning: string;
  approvedBy?: string; approvedAt?: string; rejectedBy?: string;
  rejectionReason?: string; createdAt: string;
  report?: { title: string; severity: string; location: string };
}
interface AIOverrideGov {
  id: string; reportId: string; aiDecision: string; humanAction: string;
  finalDecision?: string; reviewNotes?: string; confidence?: number;
  urgencyScore?: number; requiresHumanReview: boolean;
  reviewedAt?: string; reviewedBy?: string; createdAt: string;
  report?: { title: string; severity: string };
}
interface OverrideRecord {
  id: string; incidentId: string; incidentType: string;
  originalDecision: any; overriddenDecision?: any;
  aiConfidence: string; aiUrgency?: string;
  requiresHumanReview: boolean; status: string;
  overriddenBy?: string; reason?: string; notes?: string;
  createdAt: string; reviewedAt?: string;
}
interface OverrideStats { total: number; pending: number; approved: number; overridden: number; autoApproved: number; overrideRate: number }
interface Condition { field: string; operator: string; value: string | number }
interface Action    { type: string; parameters?: Record<string, unknown> }
interface PolicyRule {
  id: string; name: string; description?: string;
  conditions: Condition[]; logicalOperator: string;
  actions: Action[]; enabled: boolean; priority: number;
  triggerCount: number; lastTriggeredAt?: string; createdAt: string;
}
interface ModelState {
  model: { version: string; sampleCount: number; isAdaptive: boolean; mode: string; algorithm: string; learningRate: number; bias: number };
  weights: { feature: string; weight: number; label: string; description: string }[];
  metrics: { precision: number | null; recall: number | null; f1: number | null; sampleCount: number };
  recentVersions: { version: string; sampleCount: number; isActive: boolean; createdAt: string }[];
  guardrails: { minWeight: number; maxWeight: number; normalization: string; fallback: string };
}
interface PerformanceData {
  currentMetrics: { precision: number | null; recall: number | null; f1: number | null; totalLabeled: number };
  weightHistory: { version: string; sampleCount: number; weights: Record<string,number>; precision: number|null; recall: number|null; f1: number|null; isActive: boolean; createdAt: string }[];
  recentOutcomes: { reportId: string; isRealCrisis: boolean; falsePositive: boolean; labelSource: string; createdAt: string }[];
}
interface SimResult {
  features: Record<string,number>;
  prediction: { crisisProbability: number; label: string; confidence: number; modelVersion: string };
  weights: Record<string,number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Engine constants
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_OPTIONS = ["severity","type","responseTime","confidence","aiScore","fusedScore","urgencyScore","location"];
const OPERATOR_OPTIONS = [
  { value: "=", label: "=" }, { value: "!=", label: "≠" }, { value: ">", label: ">" },
  { value: "<", label: "<" }, { value: ">=", label: "≥" }, { value: "<=", label: "≤" },
  { value: "contains", label: "contains" }, { value: "in", label: "in (list)" },
];
const ACTION_OPTIONS = [
  { value: "NOTIFY_AUTHORITY", label: "Notify Authority",  icon: "🔔" },
  { value: "BROADCAST_ALERT",  label: "Broadcast Alert",   icon: "📢" },
  { value: "ESCALATE",         label: "Escalate Incident", icon: "⬆️" },
  { value: "LOG",              label: "Log Only",          icon: "📝" },
];
const ACTION_COLORS: Record<string,string> = {
  NOTIFY_AUTHORITY: "text-red-400 bg-red-950/50 border-red-600/30",
  BROADCAST_ALERT:  "text-yellow-400 bg-yellow-950/50 border-yellow-600/30",
  ESCALATE:         "text-orange-400 bg-orange-950/50 border-orange-600/30",
  LOG:              "text-slate-400 bg-slate-800/50 border-slate-600/30",
};
const SEVERITY_OPTS = ["low","medium","high","critical"];
const CRISIS_TYPES = ["fire","flood","earthquake","storm","road_accident","epidemic","landslide","gas_leak","building_collapse","chemical_spill","power_outage","other"];

// ─────────────────────────────────────────────────────────────────────────────
// Adaptive Fusion constants
// ─────────────────────────────────────────────────────────────────────────────

const FEATURE_COLORS: Record<string,string> = {
  "AI Score": "bg-violet-500", "Location Risk": "bg-red-500",
  "Repetition Score": "bg-orange-500", "User Trust": "bg-emerald-500",
  "Weather Risk": "bg-sky-500", "Social Signal": "bg-pink-500",
};
const FEATURE_KEYS = ["aiScore","locationRisk","repetitionScore","userTrust","weatherScore","socialScore"];
const FEATURE_LABELS: Record<string,string> = {
  aiScore: "AI Score", locationRisk: "Location Risk",
  repetitionScore: "Repetition Score", userTrust: "User Trust",
  weatherScore: "Weather Risk", socialScore: "Social Signal",
};

function pct(v: number | null) { return v != null ? `${(v * 100).toFixed(1)}%` : "—"; }
function fmt(v: number) { return (v * 100).toFixed(1); }

// ─────────────────────────────────────────────────────────────────────────────
// Governance sub-components
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string,{ color: string; icon: any; bg: string }> = {
  PENDING:  { color: "text-yellow-400", icon: Clock,       bg: "bg-yellow-950/40 border-yellow-600/30" },
  APPROVED: { color: "text-green-400",  icon: CheckCircle, bg: "bg-green-950/40 border-green-600/30"  },
  REJECTED: { color: "text-red-400",    icon: XCircle,     bg: "bg-red-950/40 border-red-600/30"      },
  EXECUTED: { color: "text-blue-400",   icon: Activity,    bg: "bg-blue-950/40 border-blue-600/30"    },
  EXPIRED:  { color: "text-slate-400",  icon: Clock,       bg: "bg-slate-800/40 border-slate-600/30"  },
};
const TYPE_COLORS: Record<string,string> = {
  DISPATCH:  "text-red-400 bg-red-950/50 border-red-600/30",
  ESCALATE:  "text-orange-400 bg-orange-950/50 border-orange-600/30",
  BROADCAST: "text-yellow-400 bg-yellow-950/50 border-yellow-600/30",
  PREDEPLOY: "text-blue-400 bg-blue-950/50 border-blue-600/30",
};

function ConfidenceBar({ value }: { value: number }) {
  const p = Math.round((value ?? 0) * 100);
  const color = p >= 75 ? "bg-green-500" : p >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div className={`h-full ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
      <span className={`text-xs font-mono ${color.replace("bg-","text-").replace("-500","-400")}`}>{p}%</span>
    </div>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  const typeColor = TYPE_COLORS[d.decisionType] ?? "text-slate-400 bg-slate-800 border-slate-600";
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(o => !o)}>
        <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeColor}`}>{d.decisionType}</span>
            <span className="text-sm text-slate-200 truncate">{d.report?.title ?? `Report ${d.reportId.slice(-6)}`}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <ConfidenceBar value={d.confidence} />
            <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(d.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="border-t border-white/10">
            <div className="p-3 space-y-2 text-sm">
              {d.reasoning && (<div><p className="text-xs text-slate-500 mb-1">AI Reasoning</p><p className="text-slate-300 leading-relaxed">{d.reasoning}</p></div>)}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {d.approvedBy && <div className="flex items-center gap-1.5 text-green-400"><CheckCircle className="w-3 h-3" />Approved · {d.approvedAt ? new Date(d.approvedAt).toLocaleTimeString() : "—"}</div>}
                {d.rejectedBy && <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3 h-3" />Rejected: {d.rejectionReason ?? "—"}</div>}
                <div className="text-slate-500">Auto-exec: {d.autoExecutable ? "Yes" : "No"}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OverrideRowGov({ o }: { o: AIOverrideGov }) {
  const [open, setOpen] = useState(false);
  const isOverride = o.humanAction === "override";
  const isApprove  = o.humanAction === "approved";
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(o2 => !o2)}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${isOverride ? "bg-red-500" : isApprove ? "bg-green-500" : "bg-yellow-500"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${isOverride ? "text-red-400 bg-red-950/50 border-red-600/30" : "text-green-400 bg-green-950/50 border-green-600/30"}`}>
              {(o.humanAction ?? "reviewed").toUpperCase()}
            </span>
            <span className="text-sm text-slate-200 truncate">{o.report?.title ?? `Report ${o.reportId?.slice(-6)}`}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <User className="w-3 h-3" />
            <span>{o.reviewedAt ? new Date(o.reviewedAt).toLocaleTimeString() : "Pending"}</span>
            {o.confidence && <span>· Conf: {Math.round((o.confidence ?? 0) * 100)}%</span>}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="border-t border-white/10">
            <div className="p-3 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500 mb-1">AI Original</p><p className="text-slate-300">{o.aiDecision ?? "—"}</p></div>
                {o.finalDecision && <div><p className="text-xs text-slate-500 mb-1">Final Decision</p><p className="text-slate-300">{o.finalDecision}</p></div>}
              </div>
              {o.reviewNotes && <div><p className="text-xs text-slate-500 mb-1">Review Notes</p><p className="text-slate-300 text-xs">{o.reviewNotes}</p></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy Engine sub-components
// ─────────────────────────────────────────────────────────────────────────────

function RuleCard({ rule, onToggle, onDelete }: { rule: PolicyRule; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className={`rounded-xl border overflow-hidden transition-colors ${rule.enabled ? "border-slate-700/60 bg-slate-900/70" : "border-slate-800/40 bg-slate-900/30 opacity-60"}`}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-300">{rule.priority}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{rule.name}</span>
            {rule.triggerCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-600/30">{rule.triggerCount}× fired</span>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              {rule.conditions.slice(0,2).map((c,i) => (
                <span key={i} className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">{c.field} {c.operator} {String(c.value).slice(0,12)}</span>
              ))}
              {rule.conditions.length > 2 && <span className="text-slate-500">+{rule.conditions.length - 2} more</span>}
            </div>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
            {rule.actions.slice(0,2).map((a,i) => (
              <span key={i} className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ACTION_COLORS[a.type] ?? "text-slate-400 bg-slate-800 border-slate-600"}`}>
                {a.type.replace(/_/g," ")}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onToggle(rule.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={rule.enabled ? "Disable" : "Enable"}>
            {rule.enabled ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
          </button>
          <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="border-t border-white/10">
            <div className="p-4 space-y-3">
              {rule.description && <p className="text-sm text-slate-400">{rule.description}</p>}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">IF Conditions ({rule.logicalOperator})</p>
                <div className="space-y-1.5">
                  {rule.conditions.map((c,i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {i > 0 && <span className="text-xs font-bold text-amber-400 w-8 shrink-0">{rule.logicalOperator}</span>}
                      <span className="font-mono bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-200">
                        <span className="text-blue-400">{c.field}</span>{" "}<span className="text-yellow-400">{c.operator}</span>{" "}<span className="text-green-400">"{c.value}"</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">THEN Actions</p>
                <div className="flex flex-wrap gap-2">
                  {rule.actions.map((a,i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${ACTION_COLORS[a.type] ?? "text-slate-400 bg-slate-800 border-slate-600"}`}>
                      <Zap className="w-3 h-3" />{a.type.replace(/_/g," ")}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-slate-600">
                Created {new Date(rule.createdAt).toLocaleDateString()}
                {rule.lastTriggeredAt && ` · Last triggered ${new Date(rule.lastTriggeredAt).toLocaleString()}`}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RuleBuilder({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logicalOp, setLogicalOp] = useState<"AND"|"OR">("AND");
  const [priority, setPriority] = useState(0);
  const [conditions, setConditions] = useState<Condition[]>([{ field: "severity", operator: "=", value: "critical" }]);
  const [actions, setActions] = useState<Action[]>([{ type: "NOTIFY_AUTHORITY" }]);
  const [testCtx, setTestCtx] = useState(`{"severity":"critical","responseTime":90,"aiScore":0.88}`);
  const [testResult, setTestResult] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: () => apiRequest("/api/policy-engine/rules", {
      method: "POST",
      body: JSON.stringify({ name, description, conditions, logicalOperator: logicalOp, actions, priority }),
    }),
    onSuccess: () => { toast({ title: "Rule created successfully" }); setName(""); setDescription(""); setTestResult(null); setConditions([{ field: "severity", operator: "=", value: "critical" }]); setActions([{ type: "NOTIFY_AUTHORITY" }]); onCreated(); },
    onError: () => toast({ title: "Failed to create rule", variant: "destructive" }),
  });
  const testMutation = useMutation({
    mutationFn: () => {
      let ctx: Record<string,unknown> = {};
      try { ctx = JSON.parse(testCtx); } catch { return Promise.reject("Invalid JSON"); }
      return apiRequest("/api/policy-engine/test", { method: "POST", body: JSON.stringify({ conditions, logicalOperator: logicalOp, actions, context: ctx }) });
    },
    onSuccess: (data: any) => setTestResult(data),
    onError: () => toast({ title: "Test failed", variant: "destructive" }),
  });

  function addCondition() { setConditions(c => [...c, { field: "type", operator: "=", value: "flood" }]); }
  function removeCondition(i: number) { setConditions(c => c.filter((_,idx) => idx !== i)); }
  function updateCondition(i: number, key: keyof Condition, val: string) { setConditions(c => c.map((cond,idx) => idx === i ? { ...cond, [key]: val } : cond)); }
  function addAction() { setActions(a => [...a, { type: "BROADCAST_ALERT" }]); }
  function removeAction(i: number) { setActions(a => a.filter((_,idx) => idx !== i)); }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-5">
      <h3 className="text-sm font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Rule Builder</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">Rule Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Critical Flood Alert" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Priority (0–100)</label>
          <input type="number" value={priority} onChange={e => setPriority(parseInt(e.target.value)||0)} min={0} max={100} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">Description (optional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this rule do?" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">IF Conditions</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Join with:</span>
            {(["AND","OR"] as const).map(op => (
              <button key={op} onClick={() => setLogicalOp(op)} className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${logicalOp===op ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white bg-slate-800"}`}>{op}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {conditions.map((c,i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className={`text-xs font-bold w-8 shrink-0 ${logicalOp==="OR" ? "text-purple-400" : "text-amber-400"}`}>{logicalOp}</span>}
              <select value={c.field} onChange={e => updateCondition(i,"field",e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-blue-300 focus:outline-none">
                {FIELD_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={c.operator} onChange={e => updateCondition(i,"operator",e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-yellow-300 focus:outline-none">
                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={String(c.value)} onChange={e => updateCondition(i,"value",e.target.value)} placeholder="value" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-green-300 placeholder-slate-600 focus:outline-none" />
              <button onClick={() => removeCondition(i)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><XCircle className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={addCondition} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add condition</button>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1"><ArrowRight className="w-3 h-3" /> THEN Actions</label>
        </div>
        <div className="space-y-2">
          {actions.map((a,i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={a.type} onChange={e => setActions(prev => prev.map((ac,idx) => idx===i ? { ...ac, type: e.target.value } : ac))} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-orange-300 focus:outline-none">
                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
              </select>
              <button onClick={() => removeAction(i)} className="p-1 text-slate-500 hover:text-red-400"><XCircle className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={addAction} className="mt-2 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add action</button>
      </div>
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 space-y-2">
        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1"><Play className="w-3 h-3" /> Test Rule (JSON context)</label>
        <textarea value={testCtx} onChange={e => setTestCtx(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-green-300 focus:outline-none resize-none" />
        <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-300 hover:bg-blue-900/30 h-7 text-xs" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
          <Play className="w-3 h-3 mr-1" />{testMutation.isPending ? "Testing…" : "Run Test"}
        </Button>
        {testResult && (
          <div className={`text-xs p-2 rounded-lg border ${testResult.matched ? "bg-green-950/40 border-green-600/30 text-green-300" : "bg-slate-800/60 border-slate-600/30 text-slate-400"}`}>
            {testResult.matched ? `✓ MATCH — ${testResult.actionsWouldExecute.map((a: any) => a.type).join(", ")} would execute` : `✗ NO MATCH — conditions not met`}
            <div className="mt-1 space-y-0.5">
              {testResult.conditionResults?.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-1">
                  {r.matched ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="font-mono">{r.condition.field} {r.condition.operator} {String(r.condition.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => createMutation.mutate()} disabled={!name || conditions.length===0 || actions.length===0 || createMutation.isPending}>
        {createMutation.isPending ? "Saving…" : "Create Rule"}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptive Fusion sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MetricPill({ label, value }: { label: string; value: number | null }) {
  const color = value == null ? "bg-muted text-muted-foreground"
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

// ─────────────────────────────────────────────────────────────────────────────
// Override status configs
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string,string> = {
  pending_review: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  approved:       "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  overridden:     "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  auto_approved:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
};
const SEV_CFG: Record<string,string> = {
  low:      "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  medium:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  high:     "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "governance",   label: "Governance",        icon: Shield     },
  { id: "policies",     label: "Policies",           icon: Settings   },
  { id: "audit",        label: "Audit Trail",        icon: Brain      },
  { id: "overrides",    label: "Overrides",          icon: ShieldAlert},
  { id: "performance",  label: "Model Performance",  icon: BarChart3  },
  { id: "evolution",    label: "Model Evolution",    icon: GitBranch  },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AIControlCenter() {
  const [activeTab, setActiveTab] = useState<TabId>("governance");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Page header */}
        <SectionHeader
          icon={ShieldCheck}
          title="AI Control Center"
          subtitle="Unified governance, policy, audit, override, and model intelligence — all AI systems in one place"
          iconColor="text-violet-400"
          iconBg="bg-violet-900/30 border-violet-500/30"
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
                  active
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "governance"  && <GovernanceTab onGoToOverrides={() => setActiveTab("overrides")} />}
            {activeTab === "policies"    && <PoliciesTab />}
            {activeTab === "audit"       && <AuditTab />}
            {activeTab === "overrides"   && <OverridesTab />}
            {activeTab === "performance" && <ModelPerformanceTab />}
            {activeTab === "evolution"   && <ModelEvolutionTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Governance
// ─────────────────────────────────────────────────────────────────────────────

function GovernanceTab({ onGoToOverrides }: { onGoToOverrides: () => void }) {
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");

  const { data: decisionsData } = useQuery({
    queryKey: ["decisions", decisionFilter],
    queryFn: () => apiRequest(`/api/decisions${decisionFilter !== "ALL" ? `?status=${decisionFilter}` : ""}`),
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
  const overrides: AIOverrideGov[] = overridesData?.overrides ?? overridesData ?? [];
  const pendingDecisions = decisions.filter(d => d.status === "PENDING").length;
  const overrideRate = overrideStats?.overrideRate ?? 0;
  const avgConf = decisionStats?.avgConfidence ?? 0;
  const totalDecisions = decisionStats?.total ?? 0;
  const FILTER_TABS = ["ALL","PENDING","APPROVED","REJECTED","EXECUTED"];

  return (
    <div className="space-y-6">
      {/* Governance rule banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-900/40 border border-amber-500/30 shrink-0"><Gauge className="w-4 h-4 text-amber-400" /></div>
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">Active Governance Rule</p>
            <div className="flex items-center gap-2 flex-wrap text-sm text-slate-300">
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-xs">confidence &lt; 0.75</span>
              <span className="text-slate-500">OR</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-600 text-xs">severity === "critical"</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-semibold">Requires human approval</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { label: "AI Decision",       color: "bg-blue-900/60 border-blue-500/40 text-blue-300"     },
            { label: "Confidence Check",  color: "bg-yellow-900/60 border-yellow-500/40 text-yellow-300"},
            { label: "Threshold Gate",    color: "bg-amber-900/60 border-amber-500/40 text-amber-300"   },
            { label: "Human Review",      color: "bg-purple-900/60 border-purple-500/40 text-purple-300"},
            { label: "Final Action",      color: "bg-green-900/60 border-green-500/40 text-green-300"   },
          ].map((step,i,arr) => (
            <div key={step.label} className="flex items-center gap-2 shrink-0">
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${step.color}`}>{step.label}</div>
              {i < arr.length-1 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total AI Decisions" value={totalDecisions} icon={Brain} iconColor="text-blue-400" iconBg="bg-blue-900/30 border-blue-500/20" />
        <StatCard label="Pending Review" value={pendingDecisions} icon={Clock} iconColor={pendingDecisions > 0 ? "text-yellow-400" : "text-green-400"} iconBg={pendingDecisions > 0 ? "bg-yellow-900/30 border-yellow-500/20" : "bg-green-900/30 border-green-500/20"} trend={pendingDecisions > 0 ? "need attention" : undefined} />
        <StatCard label="Override Rate" value={`${Math.round(overrideRate * 100)}%`} icon={GitBranch} iconColor="text-orange-400" iconBg="bg-orange-900/30 border-orange-500/20" />
        <StatCard label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} icon={Gauge} iconColor={avgConf >= 0.75 ? "text-green-400" : "text-yellow-400"} iconBg={avgConf >= 0.75 ? "bg-green-900/30 border-green-500/20" : "bg-yellow-900/30 border-yellow-500/20"} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* AI Decisions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-bold text-white">AI Decision Log</h2></div>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-500" />
              <div className="flex gap-1">
                {FILTER_TABS.map(tab => (
                  <button key={tab} onClick={() => setDecisionFilter(tab)}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${decisionFilter===tab ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
                    {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[520px] pr-1">
            {decisions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Brain className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No decisions match this filter</p>
              </div>
            ) : (
              <AnimatePresence>{decisions.map(d => <DecisionRow key={d.id} d={d} />)}</AnimatePresence>
            )}
          </div>
        </div>

        {/* Human Interventions */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-purple-400" /><h2 className="text-sm font-bold text-white">Human Intervention Audit</h2></div>
            {overrideStats?.pendingReview > 0 && <Badge className="bg-yellow-600 text-white text-xs">{overrideStats.pendingReview} pending</Badge>}
          </div>
          {overrideStats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Auto-Approved", value: overrideStats.autoApproved ?? 0,    color: "text-green-400"  },
                { label: "Overridden",    value: overrideStats.overridden ?? 0,      color: "text-red-400"    },
                { label: "Pending",       value: overrideStats.pendingReview ?? 0,   color: "text-yellow-400" },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-2.5 text-center">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[420px] pr-1">
            {overrides.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Shield className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No human interventions yet</p>
              </div>
            ) : (
              <AnimatePresence>{overrides.slice(0,30).map(o => <OverrideRowGov key={o.id} o={o} />)}</AnimatePresence>
            )}
          </div>
          <div className="pt-2 border-t border-white/10">
            <Button variant="outline" size="sm" className="w-full text-xs border-purple-500/30 text-purple-300 hover:bg-purple-900/20" onClick={onGoToOverrides}>
              <Eye className="w-3.5 h-3.5 mr-1.5" />Full Override Console
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Policies
// ─────────────────────────────────────────────────────────────────────────────

function PoliciesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showBuilder, setShowBuilder] = useState(false);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["policy-rules"],
    queryFn: () => apiRequest("/api/policy-engine/rules"),
    refetchInterval: 15_000,
  });
  const { data: statsData } = useQuery({
    queryKey: ["policy-stats"],
    queryFn: () => apiRequest("/api/policy-engine/stats"),
    refetchInterval: 30_000,
  });
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/policy-engine/rules/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policy-rules"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/policy-engine/rules/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["policy-rules"] }); toast({ title: "Rule deleted" }); },
  });

  const rules: PolicyRule[] = rulesData?.rules ?? [];
  const stats = statsData ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Policy Engine</h2>
          <p className="text-sm text-slate-400 mt-0.5">Dynamic IF→THEN rule engine — configure system behavior without code changes.</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowBuilder(v => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />{showBuilder ? "Hide Builder" : "New Rule"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Rules"    value={stats.total ?? 0}              icon={Settings}     iconColor="text-blue-400"    iconBg="bg-blue-900/30 border-blue-500/20" />
        <StatCard label="Active Rules"   value={stats.enabled ?? 0}            icon={ToggleRight}  iconColor="text-green-400"   iconBg="bg-green-900/30 border-green-500/20" />
        <StatCard label="Total Triggers" value={stats.totalTriggers ?? 0}      icon={Zap}          iconColor="text-yellow-400"  iconBg="bg-yellow-900/30 border-yellow-500/20" />
        <StatCard label="Success Rate"   value={`${Math.round((stats.successRate ?? 1) * 100)}%`} icon={CheckCircle} iconColor="text-emerald-400" iconBg="bg-emerald-900/30 border-emerald-500/20" />
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
        <p className="text-xs font-semibold text-blue-300 mb-2">How the Policy Engine works</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
          {["Incident Event","Rule Evaluator","Condition Check (AND/OR)","Action Executor","Audit Log"].map((s,i,arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">{s}</span>
              {i < arr.length-1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Active Rules ({rules.length})</h2>
            <span className="text-xs text-slate-500">Ordered by priority (highest first)</span>
          </div>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse" />)}</div>
          ) : rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
              <Settings className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No policy rules yet</p>
              <p className="text-xs text-slate-600 mt-1">Click "New Rule" to create your first rule</p>
            </div>
          ) : (
            <AnimatePresence>
              {rules.map(rule => <RuleCard key={rule.id} rule={rule} onToggle={id => toggleMutation.mutate(id)} onDelete={id => deleteMutation.mutate(id)} />)}
            </AnimatePresence>
          )}
        </div>
        <div className="xl:col-span-2 space-y-4">
          {showBuilder && <RuleBuilder onCreated={() => { qc.invalidateQueries({ queryKey: ["policy-rules"] }); setShowBuilder(false); }} />}
          {!showBuilder && (
            <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
              <Plus className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Click "New Rule" to open the rule builder</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Audit Trail
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string,string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e",
};

interface AuditDecision {
  reportId: string; title: string; type: string; severity: string; location: string;
  createdAt: string; auditId: string; confidence: number; fusedPriority: string;
  finalScore: number; triggered: boolean; urgencyLevel: string; isSuspicious: boolean; isGenuineEmergency: boolean;
}

function AuditTab() {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: decisionsData, isLoading } = useQuery<{ decisions: AuditDecision[]; total: number; page: number; limit: number }>({
    queryKey: ["/api/ai/decisions", page],
    queryFn: () => apiRequest(`/api/ai/decisions?page=${page}&limit=20`),
  });

  const decisions = decisionsData?.decisions ?? [];
  const selected  = decisions.find(d => d.reportId === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">AI Decision Intelligence</h2>
            <p className="text-xs text-slate-500 mt-0.5">Signal fusion · Contributing factors · Decision reasoning · Audit trail</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {decisionsData?.total ?? 0} decisions logged
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent AI Decisions</span>
            <span className="text-[10px] text-slate-600">Page {page}</span>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : decisions.length === 0 ? (
            <Alert className="border-slate-800 bg-slate-900"><AlertDescription className="text-slate-400 text-xs">No AI decisions recorded yet. Submit a report to generate decisions.</AlertDescription></Alert>
          ) : (
            <div className="space-y-1.5">
              {decisions.map((d,i) => {
                const isSelected = selectedId === d.reportId;
                const p = Math.round(d.confidence * 100);
                return (
                  <motion.button key={d.reportId} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedId(d.reportId)}
                    className={`w-full text-left p-3 rounded-xl border transition-all group ${isSelected ? "border-red-500/40 bg-red-500/5" : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{d.title}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{d.location}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[d.fusedPriority] ?? "#64748b" }} />
                        <span className="text-[10px] font-black" style={{ color: PRIORITY_COLOR[d.fusedPriority] ?? "#94a3b8" }}>{d.fusedPriority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${p}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 tabular-nums w-8">{p}%</span>
                      {d.isSuspicious && <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                      {d.triggered    && <Shield className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                      <ChevronRight className={`w-3 h-3 text-slate-600 transition-colors ${isSelected ? "text-red-500" : "group-hover:text-slate-400"}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-slate-600 font-mono">{d.auditId.slice(0,18)}…</span>
                      <span className="text-[9px] text-slate-700">·</span>
                      <span className="text-[9px] text-slate-600 capitalize">{d.type.replace(/_/g," ")}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 h-7 text-xs" disabled={page<=1} onClick={() => setPage(p => p-1)}>← Prev</Button>
            <Button size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 h-7 text-xs" disabled={(decisionsData?.total ?? 0) <= page * 20} onClick={() => setPage(p => p+1)}>Next →</Button>
          </div>
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {!selectedId ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-72 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600">
                <Eye className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold text-sm">Select a decision</p>
                <p className="text-xs mt-1 text-slate-700">Click any entry to inspect the AI reasoning</p>
              </motion.div>
            ) : (
              <motion.div key={selectedId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {selected && (
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div><p className="text-xs font-bold text-slate-300">{selected.title}</p><p className="text-[10px] text-slate-500">{selected.location}</p></div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-slate-200 border border-slate-800" onClick={() => setLocation(`/reports/${selectedId}`)}>View Report →</Button>
                  </div>
                )}
                <AIExplainabilityPanel reportId={selectedId} createdAt={selected?.createdAt ?? new Date().toISOString()} compact={false} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Overrides
// ─────────────────────────────────────────────────────────────────────────────

function OverridesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [overrideAction, setOverrideAction] = useState<"approve"|"override">("approve");
  const [newSeverity, setNewSeverity] = useState("high");
  const [newType, setNewType] = useState("other");
  const [reason, setReason] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"pending"|"all">("pending");

  const { data: stats } = useQuery<OverrideStats>({ queryKey: ["/api/ai-overrides/stats/summary"], refetchInterval: 15000 });
  const { data: pendingData } = useQuery<{ overrides: OverrideRecord[] }>({ queryKey: ["/api/ai-overrides?status=pending_review"], refetchInterval: 10000 });
  const { data: allData } = useQuery<{ overrides: OverrideRecord[] }>({ queryKey: ["/api/ai-overrides"] });
  const selectedRecord = allData?.overrides?.find(r => r.id === reviewId);

  const reviewMutation = useMutation({
    mutationFn: () => apiRequest(`/api/ai-overrides/${reviewId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ action: overrideAction, overriddenDecision: overrideAction === "override" ? { crisisType: newType, severity: newSeverity } : undefined, reason }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-overrides"] });
      qc.invalidateQueries({ queryKey: ["/api/ai-overrides/stats/summary"] });
      setReviewId(null); setReason("");
      toast({ title: `Decision ${overrideAction === "approve" ? "approved" : "overridden"} with audit trail` });
    },
    onError: () => toast({ title: "Review failed", variant: "destructive" }),
  });

  const pending = pendingData?.overrides || [];
  const all = allData?.overrides || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-blue-500" /></div>
        <div>
          <h2 className="text-lg font-bold text-white">AI Decision Override</h2>
          <p className="text-sm text-slate-400">Human-in-the-loop governance — review AI classifications with full audit trail</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Decisions", value: stats?.total ?? 0,              color: "text-blue-400",   bg: "bg-blue-500/10",   icon: BarChart3    },
          { label: "Pending Review",  value: stats?.pending ?? 0,            color: stats?.pending ? "text-orange-400" : "text-green-400", bg: stats?.pending ? "bg-orange-500/10" : "bg-green-500/10", icon: Clock },
          { label: "Approved",        value: stats?.approved ?? 0,           color: "text-green-400",  bg: "bg-green-500/10",  icon: CheckCircle  },
          { label: "Overridden",      value: stats?.overridden ?? 0,         color: "text-red-400",    bg: "bg-red-500/10",    icon: AlertTriangle},
          { label: "Override Rate",   value: `${stats?.overrideRate ?? 0}%`, color: "text-purple-400", bg: "bg-purple-500/10", icon: BarChart3    },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
          <div className="flex items-center gap-3 pl-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-orange-400">
              {pending.length} AI decision{pending.length > 1 ? "s" : ""} flagged for human review — confidence below threshold or critical severity
            </p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800">
        {([["pending","Pending Review"], ["all","All Decisions"]] as const).map(([key,label]) => (
          <button key={key} onClick={() => setActiveSubTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeSubTab===key ? "border-violet-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}>
            {label}
            {key === "pending" && pending.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">{pending.length}</span>
            )}
            {key === "all" && ` (${all.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(activeSubTab === "pending" ? pending : all).length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-50" />
            <p className="font-semibold text-slate-300">{activeSubTab === "pending" ? "No decisions pending review" : "No AI decisions recorded yet"}</p>
          </div>
        ) : (activeSubTab === "pending" ? pending : all).map(row => (
          <div key={row.id} className={`rounded-2xl border bg-slate-900/60 p-4 ${row.requiresHumanReview && row.status === "pending_review" ? "border-orange-700" : "border-slate-700/60"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_CFG[row.status]}`}>{row.status.replace(/_/g," ")}</span>
                  {row.requiresHumanReview && <span className="text-xs px-2 py-0.5 rounded-full border border-orange-400 text-orange-400">⚠ Flagged</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEV_CFG[row.originalDecision?.severity || "medium"]}`}>{row.originalDecision?.severity || "unknown"}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><p className="text-xs text-slate-400">Crisis Type</p><p className="text-sm font-semibold text-slate-200 capitalize">{(row.originalDecision?.crisisType || "unknown").replace(/_/g," ")}</p></div>
                  <div><p className="text-xs text-slate-400">AI Confidence</p><p className="text-sm font-semibold text-slate-200">{(parseFloat(row.aiConfidence) * 100).toFixed(0)}%</p></div>
                  <div><p className="text-xs text-slate-400">Urgency</p><p className="text-sm font-semibold text-slate-200">{row.aiUrgency ? (parseFloat(row.aiUrgency) * 100).toFixed(0) + "%" : "—"}</p></div>
                  <div><p className="text-xs text-slate-400">Incident ID</p><p className="text-xs font-mono text-slate-500">{row.incidentId.slice(0,12)}…</p></div>
                </div>
                {row.overriddenDecision && row.status === "overridden" && (
                  <div className="mt-3 bg-red-950/30 border border-red-800 rounded-xl p-3">
                    <p className="text-xs font-bold text-red-400 mb-1">Override applied</p>
                    <p className="text-xs text-red-500 capitalize">{row.overriddenDecision.crisisType} — {row.overriddenDecision.severity}</p>
                    {row.reason && <p className="text-xs text-slate-400 mt-1">Reason: {row.reason}</p>}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(row.createdAt).toLocaleString()}</p>
              </div>
              {row.status === "pending_review" && (
                <Button size="sm" className="flex-shrink-0 h-8 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => { setReviewId(row.id); setNewSeverity(row.originalDecision?.severity || "high"); setNewType(row.originalDecision?.crisisType || "other"); }}>
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" />Review
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!reviewId} onOpenChange={v => !v && setReviewId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Review AI Decision</DialogTitle></DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">AI Original Decision</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "Crisis Type", value: (selectedRecord.originalDecision?.crisisType || "—").replace(/_/g," ") },
                    { label: "Severity",    value: selectedRecord.originalDecision?.severity || "—" },
                    { label: "Confidence",  value: `${(parseFloat(selectedRecord.aiConfidence) * 100).toFixed(0)}%` },
                    { label: "Urgency",     value: selectedRecord.aiUrgency ? `${(parseFloat(selectedRecord.aiUrgency) * 100).toFixed(0)}%` : "—" },
                  ].map(({ label, value }) => (
                    <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold capitalize">{value}</p></div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Action</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOverrideAction("approve")}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${overrideAction==="approve" ? "border-green-500 bg-green-950 text-green-300" : "border-border hover:border-green-400"}`}>
                    <CheckCircle className="w-5 h-5 mb-1.5 mx-auto" />Approve AI
                  </button>
                  <button onClick={() => setOverrideAction("override")}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${overrideAction==="override" ? "border-red-500 bg-red-950 text-red-300" : "border-border hover:border-red-400"}`}>
                    <AlertTriangle className="w-5 h-5 mb-1.5 mx-auto" />Override
                  </button>
                </div>
              </div>
              {overrideAction === "override" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">New Severity</Label>
                    <Select value={newSeverity} onValueChange={setNewSeverity}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITY_OPTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">New Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Reason / Notes (audit trail)</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Explain your decision…" className="text-sm" />
              </div>
              <Button className={`w-full font-semibold ${overrideAction==="approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
                onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? "Submitting…" : overrideAction==="approve" ? "✓ Approve AI Decision" : "⚡ Submit Override"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Model Performance
// ─────────────────────────────────────────────────────────────────────────────

function ModelPerformanceTab() {
  const qc = useQueryClient();
  const [showGuardrails, setShowGuardrails] = useState(false);

  const { data: model, isLoading: modelLoading } = useQuery<ModelState>({
    queryKey: ["/api/fusion/model"],
    refetchInterval: 15_000,
  });
  const { data: perf } = useQuery<PerformanceData>({
    queryKey: ["/api/fusion/performance"],
    refetchInterval: 30_000,
  });

  if (modelLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const w = model?.weights ?? [];
  const maxWeight = Math.max(...w.map(x => x.weight), 0.01);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Adaptive Signal Fusion — Model Performance</h2>
          <p className="text-sm text-slate-400 mt-0.5">Logistic regression model that learns fusion weights from labeled outcomes.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ["/api/fusion/model"] }); qc.invalidateQueries({ queryKey: ["/api/fusion/performance"] }); }}>
          <RefreshCw className="w-3 h-3 mr-1" />Refresh
        </Button>
      </div>

      {/* Architecture banner */}
      <Card className="border border-violet-500/20 bg-violet-500/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            {[
              { label: "Report Created" }, { label: "Feature Extraction" }, { label: "Logistic Regression", highlight: "violet" },
              { label: "Fused Score" }, { label: "Decision Engine" }, { label: "Outcome Labeled", highlight: "emerald" },
              { label: "SGD Weight Update", highlight: "amber" },
            ].map((step,i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  step.highlight === "violet" ? "bg-violet-500 text-white"
                  : step.highlight === "emerald" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                  : step.highlight === "amber" ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                  : "bg-muted text-muted-foreground"
                }`}>{step.label}</div>
                {i < 6 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Brain className="w-8 h-8 text-violet-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">Model Version</div><div className="font-bold font-mono text-sm">{model?.model.version ?? "—"}</div><div className="text-xs text-muted-foreground">{model?.model.mode}</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">Labeled Outcomes</div><div className="font-bold text-2xl">{model?.model.sampleCount ?? 0}</div><div className="text-xs text-muted-foreground">training samples</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Target className="w-8 h-8 text-sky-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">Precision</div><div className="font-bold text-2xl">{pct(model?.metrics.precision ?? null)}</div><div className="text-xs text-muted-foreground">true positive rate</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-orange-400 shrink-0" />
          <div><div className="text-xs text-muted-foreground">F1 Score</div><div className="font-bold text-2xl">{pct(model?.metrics.f1 ?? null)}</div><div className="text-xs text-muted-foreground">harmonic mean P/R</div></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight vector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="w-4 h-4 text-violet-400" />
              Current Weight Vector
              {model?.model.isAdaptive
                ? <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Adaptive</Badge>
                : <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">Static Priors</Badge>}
            </CardTitle>
            <CardDescription className="text-xs">Learned weights — sum to 1, clamped to [{model?.guardrails.minWeight}–{model?.guardrails.maxWeight}]</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {w.map(feat => (
              <motion.div key={feat.feature} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${FEATURE_COLORS[feat.label] ?? "bg-muted"}`} />
                    <span className="font-medium">{feat.label}</span>
                  </div>
                  <span className="font-mono text-xs tabular-nums">{fmt(feat.weight)}%</span>
                </div>
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div className={`h-full rounded-full ${FEATURE_COLORS[feat.label] ?? "bg-primary"}`} initial={{ width: 0 }} animate={{ width: `${(feat.weight / maxWeight) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
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

        {/* Model metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="w-4 h-4 text-sky-400" />Model Performance</CardTitle>
            <CardDescription className="text-xs">Evaluated on labeled outcomes &nbsp;·&nbsp; {perf?.currentMetrics.totalLabeled ?? 0} samples total</CardDescription>
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
                <div>No labeled outcomes yet. Label report outcomes via <code className="font-mono">POST /api/fusion/outcomes/:id</code> to start training the model.</div>
              </div>
            )}
            {(perf?.weightHistory.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Recent Model Versions</div>
                {perf?.weightHistory.slice(0,5).map(h => (
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Model Evolution
// ─────────────────────────────────────────────────────────────────────────────

function ModelEvolutionTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [simFeatures, setSimFeatures] = useState<Record<string,number>>({
    aiScore: 0.6, locationRisk: 0.4, repetitionScore: 0.2,
    userTrust: 0.7, weatherScore: 0.1, socialScore: 0.0,
  });
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  const { data: perf } = useQuery<PerformanceData>({
    queryKey: ["/api/fusion/performance"],
    refetchInterval: 30_000,
  });

  const simMutation = useMutation({
    mutationFn: (features: Record<string,number>) => apiRequest("/api/fusion/simulate", { method: "POST", body: JSON.stringify(features) }),
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const runSim = async () => {
    const result = await simMutation.mutateAsync(simFeatures);
    setSimResult(result);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Model Evolution</h2>
          <p className="text-sm text-slate-400 mt-0.5">Simulator, version history, and outcome feed — track how the model learns over time.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["/api/fusion/performance"] })}>
          <RefreshCw className="w-3 h-3 mr-1" />Refresh
        </Button>
      </div>

      {/* Simulator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Zap className="w-4 h-4 text-amber-400" />Model Simulator</CardTitle>
          <CardDescription className="text-xs">Drag signal sliders to see how the current weight vector classifies an incident</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Slider min={0} max={100} step={1} value={[simFeatures[k] * 100]} onValueChange={([v]) => setSimFeatures(f => ({ ...f, [k]: v / 100 }))} className="w-full" />
                </div>
              ))}
              <Button onClick={runSim} disabled={simMutation.isPending} className="w-full">
                {simMutation.isPending ? <><RefreshCw className="w-3 h-3 mr-2 animate-spin" />Running…</> : <><Zap className="w-3 h-3 mr-2" />Run Simulation</>}
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {simResult ? (
                <>
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`rounded-xl p-6 text-center border ${simResult.prediction.label === "real-crisis" ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                    {simResult.prediction.label === "real-crisis"
                      ? <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                      : <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />}
                    <div className={`text-3xl font-bold ${simResult.prediction.label === "real-crisis" ? "text-red-400" : "text-emerald-400"}`}>
                      {(simResult.prediction.crisisProbability * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm mt-1 font-medium capitalize">{simResult.prediction.label.replace("-"," ")}</div>
                    <div className="text-xs text-muted-foreground mt-1">Confidence: {(simResult.prediction.confidence * 100).toFixed(1)}% · {simResult.prediction.modelVersion}</div>
                  </motion.div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Feature contributions</div>
                    {FEATURE_KEYS.map(k => {
                      const fv = simFeatures[k];
                      const wv = simResult.weights[k] ?? 0;
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

      {/* Outcome Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            Outcome Feed
            <Badge variant="outline" className="text-xs font-normal ml-auto">Training labels → weight updates</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(perf?.recentOutcomes.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-10 h-10 opacity-20 mx-auto mb-2" />
              <div className="text-sm">No outcomes labeled yet.</div>
              <div className="text-xs mt-1">Use <code className="font-mono">POST /api/fusion/outcomes/:reportId</code> with <code className="font-mono">{"{ isRealCrisis: true|false }"}</code> to label a report and trigger a weight update.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {perf?.recentOutcomes.map((o,i) => (
                <motion.div key={o.reportId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    {o.isRealCrisis ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span className="font-mono text-xs text-muted-foreground">{o.reportId.slice(0,12)}…</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{o.labelSource}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{o.isRealCrisis ? "Real Crisis" : "False Positive"}</span>
                    <span>{new Date(o.createdAt).toLocaleString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
