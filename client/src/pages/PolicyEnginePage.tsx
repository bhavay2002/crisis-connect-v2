import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Plus, Trash2, ToggleLeft, ToggleRight, Play,
  CheckCircle, XCircle, ChevronDown, ChevronUp, Zap,
  ArrowRight, AlertTriangle, Activity, Shield,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Condition { field: string; operator: string; value: string | number }
interface Action    { type: string; parameters?: Record<string, unknown> }
interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  logicalOperator: string;
  actions: Action[];
  enabled: boolean;
  priority: number;
  triggerCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const FIELD_OPTIONS = [
  "severity", "type", "responseTime", "confidence", "aiScore",
  "fusedScore", "urgencyScore", "location",
];
const OPERATOR_OPTIONS = [
  { value: "=",        label: "=" },
  { value: "!=",       label: "≠" },
  { value: ">",        label: ">" },
  { value: "<",        label: "<" },
  { value: ">=",       label: "≥" },
  { value: "<=",       label: "≤" },
  { value: "contains", label: "contains" },
  { value: "in",       label: "in (list)" },
];
const ACTION_OPTIONS = [
  { value: "NOTIFY_AUTHORITY", label: "Notify Authority",  icon: "🔔" },
  { value: "BROADCAST_ALERT",  label: "Broadcast Alert",   icon: "📢" },
  { value: "ESCALATE",         label: "Escalate Incident", icon: "⬆️" },
  { value: "LOG",              label: "Log Only",          icon: "📝" },
];

const ACTION_COLORS: Record<string, string> = {
  NOTIFY_AUTHORITY: "text-red-400 bg-red-950/50 border-red-600/30",
  BROADCAST_ALERT:  "text-yellow-400 bg-yellow-950/50 border-yellow-600/30",
  ESCALATE:         "text-orange-400 bg-orange-950/50 border-orange-600/30",
  LOG:              "text-slate-400 bg-slate-800/50 border-slate-600/30",
};

// ── Rule Card ──────────────────────────────────────────────────────────────
function RuleCard({ rule, onToggle, onDelete }: {
  rule: PolicyRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`rounded-xl border overflow-hidden transition-colors ${
        rule.enabled
          ? "border-slate-700/60 bg-slate-900/70"
          : "border-slate-800/40 bg-slate-900/30 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Priority badge */}
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-300">{rule.priority}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{rule.name}</span>
            {rule.triggerCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-600/30">
                {rule.triggerCount}× fired
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {/* Conditions preview */}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              {rule.conditions.slice(0, 2).map((c, i) => (
                <span key={i} className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
                  {c.field} {c.operator} {String(c.value).slice(0, 12)}
                </span>
              ))}
              {rule.conditions.length > 2 && (
                <span className="text-slate-500">+{rule.conditions.length - 2} more</span>
              )}
            </div>
            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
            {rule.actions.slice(0, 2).map((a, i) => (
              <span key={i} className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ACTION_COLORS[a.type] ?? "text-slate-400 bg-slate-800 border-slate-600"}`}>
                {a.type.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(rule.id)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={rule.enabled ? "Disable rule" : "Enable rule"}
          >
            {rule.enabled
              ? <ToggleRight className="w-5 h-5 text-green-400" />
              : <ToggleLeft  className="w-5 h-5 text-slate-500" />}
          </button>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-1.5 rounded-lg hover:bg-red-900/30 transition-colors text-slate-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
            <div className="p-4 space-y-3">
              {rule.description && (
                <p className="text-sm text-slate-400">{rule.description}</p>
              )}
              {/* Full condition display */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">IF Conditions ({rule.logicalOperator})</p>
                <div className="space-y-1.5">
                  {rule.conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {i > 0 && (
                        <span className="text-xs font-bold text-amber-400 w-8 shrink-0">{rule.logicalOperator}</span>
                      )}
                      <span className="font-mono bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-200">
                        <span className="text-blue-400">{c.field}</span>
                        {" "}<span className="text-yellow-400">{c.operator}</span>{" "}
                        <span className="text-green-400">"{c.value}"</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">THEN Actions</p>
                <div className="flex flex-wrap gap-2">
                  {rule.actions.map((a, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${ACTION_COLORS[a.type] ?? "text-slate-400 bg-slate-800 border-slate-600"}`}>
                      <Zap className="w-3 h-3" />
                      {a.type.replace(/_/g, " ")}
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

// ── Rule Builder ───────────────────────────────────────────────────────────
function RuleBuilder({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logicalOp, setLogicalOp] = useState<"AND" | "OR">("AND");
  const [priority, setPriority] = useState(0);
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "severity", operator: "=", value: "critical" },
  ]);
  const [actions, setActions] = useState<Action[]>([{ type: "NOTIFY_AUTHORITY" }]);
  const [testCtx, setTestCtx] = useState(`{"severity":"critical","responseTime":90,"aiScore":0.88}`);
  const [testResult, setTestResult] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: () => apiRequest("/api/policy-engine/rules", {
      method: "POST",
      body: JSON.stringify({ name, description, conditions, logicalOperator: logicalOp, actions, priority }),
    }),
    onSuccess: () => {
      toast({ title: "Rule created successfully" });
      setName(""); setDescription(""); setTestResult(null);
      setConditions([{ field: "severity", operator: "=", value: "critical" }]);
      setActions([{ type: "NOTIFY_AUTHORITY" }]);
      onCreated();
    },
    onError: () => toast({ title: "Failed to create rule", variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: () => {
      let ctx: Record<string, unknown> = {};
      try { ctx = JSON.parse(testCtx); } catch { return Promise.reject("Invalid JSON"); }
      return apiRequest("/api/policy-engine/test", {
        method: "POST",
        body: JSON.stringify({ conditions, logicalOperator: logicalOp, actions, context: ctx }),
      });
    },
    onSuccess: (data: any) => setTestResult(data),
    onError: () => toast({ title: "Test failed", variant: "destructive" }),
  });

  function addCondition() {
    setConditions(c => [...c, { field: "type", operator: "=", value: "flood" }]);
  }
  function removeCondition(i: number) {
    setConditions(c => c.filter((_, idx) => idx !== i));
  }
  function updateCondition(i: number, key: keyof Condition, val: string) {
    setConditions(c => c.map((cond, idx) => idx === i ? { ...cond, [key]: val } : cond));
  }
  function addAction() {
    setActions(a => [...a, { type: "BROADCAST_ALERT" }]);
  }
  function removeAction(i: number) {
    setActions(a => a.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 space-y-5">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Plus className="w-4 h-4 text-blue-400" /> Rule Builder
      </h3>

      {/* Name + Priority */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">Rule Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Critical Flood Alert"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Priority (0–100)</label>
          <input
            type="number"
            value={priority}
            onChange={e => setPriority(parseInt(e.target.value) || 0)}
            min={0} max={100}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">Description (optional)</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does this rule do?"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* IF conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">IF Conditions</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Join with:</span>
            {(["AND", "OR"] as const).map(op => (
              <button key={op} onClick={() => setLogicalOp(op)}
                className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${
                  logicalOp === op
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white bg-slate-800"
                }`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span className={`text-xs font-bold w-8 shrink-0 ${logicalOp === "OR" ? "text-purple-400" : "text-amber-400"}`}>
                  {logicalOp}
                </span>
              )}
              <select
                value={c.field}
                onChange={e => updateCondition(i, "field", e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-blue-300 focus:outline-none"
              >
                {FIELD_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select
                value={c.operator}
                onChange={e => updateCondition(i, "operator", e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-yellow-300 focus:outline-none"
              >
                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                value={String(c.value)}
                onChange={e => updateCondition(i, "value", e.target.value)}
                placeholder="value"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-green-300 placeholder-slate-600 focus:outline-none"
              />
              <button onClick={() => removeCondition(i)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addCondition} className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add condition
        </button>
      </div>

      {/* THEN actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> THEN Actions
          </label>
        </div>
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={a.type}
                onChange={e => setActions(prev => prev.map((ac, idx) => idx === i ? { ...ac, type: e.target.value } : ac))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-orange-300 focus:outline-none"
              >
                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
              </select>
              <button onClick={() => removeAction(i)} className="p-1 text-slate-500 hover:text-red-400">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addAction} className="mt-2 text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add action
        </button>
      </div>

      {/* Test simulator */}
      <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 space-y-2">
        <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
          <Play className="w-3 h-3" /> Test Rule (JSON context)
        </label>
        <textarea
          value={testCtx}
          onChange={e => setTestCtx(e.target.value)}
          rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-green-300 focus:outline-none resize-none"
        />
        <Button
          size="sm"
          variant="outline"
          className="border-blue-500/40 text-blue-300 hover:bg-blue-900/30 h-7 text-xs"
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
        >
          <Play className="w-3 h-3 mr-1" />
          {testMutation.isPending ? "Testing…" : "Run Test"}
        </Button>
        {testResult && (
          <div className={`text-xs p-2 rounded-lg border ${testResult.matched ? "bg-green-950/40 border-green-600/30 text-green-300" : "bg-slate-800/60 border-slate-600/30 text-slate-400"}`}>
            {testResult.matched
              ? `✓ MATCH — ${testResult.actionsWouldExecute.map((a: any) => a.type).join(", ")} would execute`
              : `✗ NO MATCH — conditions not met`}
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

      <Button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => createMutation.mutate()}
        disabled={!name || conditions.length === 0 || actions.length === 0 || createMutation.isPending}
      >
        {createMutation.isPending ? "Saving…" : "Create Rule"}
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PolicyEnginePage() {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policy-rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  const rules: PolicyRule[] = rulesData?.rules ?? [];
  const stats = statsData ?? {};

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <SectionHeader
          icon={Settings}
          title="Policy Engine"
          subtitle="Dynamic IF→THEN rule engine — configure system behavior without code changes. Rules evaluate automatically on every incident event."
          iconColor="text-blue-400"
          iconBg="bg-blue-900/30 border-blue-500/30"
          rightSlot={
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowBuilder(v => !v)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {showBuilder ? "Hide Builder" : "New Rule"}
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Rules"    value={stats.total ?? 0}   icon={Settings}       iconColor="text-blue-400"   iconBg="bg-blue-900/30 border-blue-500/20" />
          <StatCard label="Active Rules"   value={stats.enabled ?? 0} icon={ToggleRight}    iconColor="text-green-400"  iconBg="bg-green-900/30 border-green-500/20" />
          <StatCard label="Total Triggers" value={stats.totalTriggers ?? 0} icon={Zap}      iconColor="text-yellow-400" iconBg="bg-yellow-900/30 border-yellow-500/20" />
          <StatCard label="Success Rate"   value={`${Math.round((stats.successRate ?? 1) * 100)}%`} icon={CheckCircle} iconColor="text-emerald-400" iconBg="bg-emerald-900/30 border-emerald-500/20" />
        </div>

        {/* How it works banner */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
          <p className="text-xs font-semibold text-blue-300 mb-2">How the Policy Engine works</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
            {["Incident Event", "Rule Evaluator", "Condition Check (AND/OR)", "Action Executor", "Audit Log"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Rules list */}
          <div className="xl:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Active Rules ({rules.length})</h2>
              <span className="text-xs text-slate-500">Ordered by priority (highest first)</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse border border-slate-700/30" />)}
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-700">
                <Settings className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No rules yet</p>
                <Button size="sm" variant="ghost" className="mt-2 text-blue-400" onClick={() => setShowBuilder(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create your first rule
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                {rules.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={id => toggleMutation.mutate(id)}
                    onDelete={id => deleteMutation.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Builder panel */}
          <div className="xl:col-span-2">
            <AnimatePresence>
              {showBuilder && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <RuleBuilder onCreated={() => {
                    qc.invalidateQueries({ queryKey: ["policy-rules"] });
                    qc.invalidateQueries({ queryKey: ["policy-stats"] });
                    setShowBuilder(false);
                  }} />
                </motion.div>
              )}
            </AnimatePresence>

            {!showBuilder && (
              <div className="rounded-xl border border-dashed border-slate-700/50 p-6 text-center">
                <Settings className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">Build dynamic rules using the visual editor</p>
                <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-300" onClick={() => setShowBuilder(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Open Rule Builder
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
