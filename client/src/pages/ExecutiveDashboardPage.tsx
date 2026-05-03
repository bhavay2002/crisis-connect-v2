import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { LiveIndicator } from "@/components/ds/LiveIndicator";
import { SeverityBadge } from "@/components/ds/SeverityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, AlertTriangle, Clock, Shield, Users, TrendingUp,
  TrendingDown, Activity, Target, ChevronRight, X, Zap,
  CheckCircle, Building2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ExecutiveSummary {
  cityStatus: "STABLE" | "WARNING" | "CRITICAL";
  activeIncidents: number;
  criticalIncidents: number;
  totalLast24h: number;
  totalLast7d: number;
  resolvedLast24h: number;
  avgResponseTime: number;
  slaCompliance: number;
  responderUtilization: number;
  totalResponders: number;
  activeSOS: number;
  incidentTrend: number;
  falseReportRate: number;
  severityBreakdown: Record<string, number>;
  typeBreakdown: [string, number][];
  generatedAt: string;
}

interface DrillDownConfig {
  severity?: string;
  type?: string;
  label: string;
}

// ── City Status Badge ──────────────────────────────────────────────────────
function CityStatusBadge({ status }: { status: "STABLE" | "WARNING" | "CRITICAL" }) {
  const cfg = {
    STABLE:   { bg: "bg-green-950/60",  border: "border-green-500/40",  text: "text-green-300",  pulse: "bg-green-500",  label: "STABLE" },
    WARNING:  { bg: "bg-yellow-950/60", border: "border-yellow-500/40", text: "text-yellow-300", pulse: "bg-yellow-500", label: "WARNING" },
    CRITICAL: { bg: "bg-red-950/60",    border: "border-red-500/40",    text: "text-red-300",    pulse: "bg-red-500",    label: "CRITICAL" },
  }[status];

  return (
    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
      <div className="relative flex items-center justify-center w-4 h-4">
        <div className={`absolute w-4 h-4 rounded-full ${cfg.pulse} opacity-30 animate-ping`} />
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.pulse}`} />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-widest leading-none mb-1">City Status</p>
        <p className={`text-2xl font-black tracking-tight leading-none ${cfg.text}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

// ── Drill-down Modal ───────────────────────────────────────────────────────
function DrillDownModal({ config, onClose }: { config: DrillDownConfig; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["exec-drilldown", config],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "30" });
      if (config.severity) params.set("severity", config.severity);
      if (config.type)     params.set("type", config.type);
      return apiRequest(`/api/executive/incidents?${params}`);
    },
  });
  const incidents = data?.incidents ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-700"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">{config.label}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{incidents.length} incidents</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
          {incidents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No incidents found</div>
          ) : incidents.map((inc: any) => (
            <div key={inc.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <SeverityBadge level={inc.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{inc.title}</p>
                <p className="text-xs text-slate-400">{inc.location} · {new Date(inc.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 capitalize shrink-0">
                {inc.status}
              </Badge>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit, sub, icon: Icon, iconColor, iconBg, trend, onClick,
}: {
  label: string; value: string | number; unit?: string; sub?: string;
  icon: any; iconColor: string; iconBg: string; trend?: number; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={`rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 ${onClick ? "cursor-pointer hover:border-blue-500/40 transition-colors" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${iconBg}`}>
          <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? "text-red-400" : "text-green-400"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
        {onClick && <ChevronRight className="w-4 h-4 text-slate-600" />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-white">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ExecutiveDashboardPage() {
  const [drillDown, setDrillDown] = useState<DrillDownConfig | null>(null);

  const { data: summary, isLoading } = useQuery<ExecutiveSummary>({
    queryKey: ["executive-summary"],
    queryFn: () => apiRequest("/api/executive/summary"),
    refetchInterval: 30_000,
  });

  const { data: trendsData } = useQuery({
    queryKey: ["executive-trends"],
    queryFn: () => apiRequest("/api/executive/trends"),
    refetchInterval: 60_000,
  });

  const { data: peakData } = useQuery({
    queryKey: ["executive-peak"],
    queryFn: () => apiRequest("/api/executive/peak-hours"),
    refetchInterval: 120_000,
  });

  const { data: slaData } = useQuery({
    queryKey: ["executive-sla"],
    queryFn: () => apiRequest("/api/executive/sla-history"),
    refetchInterval: 120_000,
  });

  const trend = trendsData?.trend ?? [];
  const peak  = peakData?.peak ?? [];
  const sla   = slaData?.history ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading executive summary…</p>
        </div>
      </div>
    );
  }

  const s = summary!;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <SectionHeader
          title="Executive Dashboard"
          description="C-level operational intelligence — real-time system status for government officials and NGO leadership"
          live
          actions={<LiveIndicator />}
        />

        {/* City Status + SLA ribbon */}
        <div className="flex flex-wrap items-center gap-4">
          <CityStatusBadge status={s.cityStatus} />
          <div className="flex items-center gap-4 ml-auto flex-wrap">
            <div className="text-center">
              <div className="text-xl font-black text-emerald-400">{s.slaCompliance}%</div>
              <div className="text-xs text-slate-500">SLA Compliance</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <div className="text-xl font-black text-blue-400">{s.avgResponseTime}s</div>
              <div className="text-xs text-slate-500">Avg Response</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <div className="text-xl font-black text-slate-200">{s.totalResponders}</div>
              <div className="text-xs text-slate-500">Responders</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-xs text-slate-500">
              Updated {new Date(s.generatedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* KPI Grid — click to drill down */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Active Incidents"
            value={s.activeIncidents}
            icon={AlertTriangle}
            iconColor="text-orange-400"
            iconBg="bg-orange-900/30 border-orange-500/20"
            trend={s.incidentTrend}
            onClick={() => setDrillDown({ label: "Active Incidents" })}
          />
          <KpiCard
            label="Critical Incidents"
            value={s.criticalIncidents}
            icon={Zap}
            iconColor="text-red-400"
            iconBg="bg-red-900/30 border-red-500/20"
            onClick={() => setDrillDown({ severity: "critical", label: "Critical Incidents" })}
          />
          <KpiCard
            label="Resolved (24h)"
            value={s.resolvedLast24h}
            icon={CheckCircle}
            iconColor="text-green-400"
            iconBg="bg-green-900/30 border-green-500/20"
          />
          <KpiCard
            label="Responder Utilization"
            value={`${s.responderUtilization}%`}
            sub={`${s.activeSOS} active SOS`}
            icon={Users}
            iconColor="text-purple-400"
            iconBg="bg-purple-900/30 border-purple-500/20"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* 7-day trend chart */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Incident Trend (7 days)
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"/> Total</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/> Critical</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"/> Resolved</span>
              </div>
            </div>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trend} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="critG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" fill="url(#totalG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fill="url(#critG)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fill="none"         strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-600">No trend data</div>
            )}
          </div>

          {/* SLA compliance history */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
              <Target className="w-4 h-4 text-emerald-400" /> SLA Compliance (4w)
            </h3>
            {sla.length > 0 ? (
              <div className="space-y-3">
                {sla.map((w: any) => {
                  const color = w.compliance >= 90 ? "bg-green-500" : w.compliance >= 75 ? "bg-yellow-500" : "bg-red-500";
                  const textColor = w.compliance >= 90 ? "text-green-400" : w.compliance >= 75 ? "text-yellow-400" : "text-red-400";
                  return (
                    <div key={w.week}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{w.label}</span>
                        <span className={`font-bold ${textColor}`}>{w.compliance}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${w.compliance}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{w.met}/{w.total} met target</p>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-white/10 text-center">
                  <div className="text-xl font-black text-emerald-400">{sla[sla.length - 1]?.compliance ?? 0}%</div>
                  <div className="text-xs text-slate-500">Current week</div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No SLA data yet</div>
            )}
          </div>
        </div>

        {/* Bottom row: Severity breakdown + Peak hours + Type breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Severity breakdown */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-400" /> Severity Breakdown
            </h3>
            <div className="space-y-3">
              {(["critical", "high", "medium", "low"] as const).map(sev => {
                const count = s.severityBreakdown?.[sev] ?? 0;
                const total = Object.values(s.severityBreakdown ?? {}).reduce((a, b) => a + b, 0) || 1;
                const pct = Math.round(count / total * 100);
                const colors = {
                  critical: { bar: "bg-red-500",    text: "text-red-400"   },
                  high:     { bar: "bg-orange-500", text: "text-orange-400" },
                  medium:   { bar: "bg-yellow-500", text: "text-yellow-400" },
                  low:      { bar: "bg-green-500",  text: "text-green-400"  },
                };
                return (
                  <div
                    key={sev}
                    className="cursor-pointer"
                    onClick={() => setDrillDown({ severity: sev, label: `${sev.charAt(0).toUpperCase() + sev.slice(1)} Incidents` })}
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-semibold capitalize ${colors[sev].text}`}>{sev}</span>
                      <span className="text-slate-300 font-bold">{count} <span className="text-slate-500">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${colors[sev].bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 mt-3">Click to drill down</p>
          </div>

          {/* Peak hours */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Peak Crisis Hours
            </h3>
            {peak.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={peak} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(h: number) => h % 6 === 0 ? `${h}h` : ""}
                    />
                    <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }: any) =>
                        active && payload?.[0] ? (
                          <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
                            <span className="text-slate-300">{payload[0].payload.label}: </span>
                            <span className="font-bold text-white">{payload[0].value} incidents</span>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {peak.map((entry: any) => (
                        <Cell key={entry.hour}
                          fill={entry.intensity >= 0.8 ? "#ef4444" : entry.intensity >= 0.5 ? "#f97316" : entry.intensity >= 0.3 ? "#eab308" : "#475569"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-500 text-center mt-1">
                  Peak at {peakData?.peakHour?.toString().padStart(2, "0") ?? "—"}:00 hrs (last 30 days)
                </p>
              </>
            ) : (
              <div className="h-36 flex items-center justify-center text-slate-600 text-sm">No data</div>
            )}
          </div>

          {/* Incident type breakdown */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" /> Top Incident Types
            </h3>
            <div className="space-y-2.5">
              {(s.typeBreakdown ?? []).slice(0, 6).map(([type, count]: [string, number], i: number) => {
                const total = (s.typeBreakdown ?? []).reduce((a: number, [, c]: [string, number]) => a + c, 0) || 1;
                const pct = Math.round(count / total * 100);
                return (
                  <div
                    key={type}
                    className="cursor-pointer"
                    onClick={() => setDrillDown({ type, label: `${type.replace(/_/g, " ")} Incidents` })}
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 capitalize">{type.replace(/_/g, " ")}</span>
                      <span className="text-slate-400">{count} <span className="text-slate-600">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-sky-500"
                        style={{ opacity: 1 - i * 0.12 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
              {(s.typeBreakdown ?? []).length === 0 && (
                <div className="text-center py-8 text-slate-600 text-sm">No incident types</div>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-3">Click to drill down</p>
          </div>
        </div>
      </div>

      {/* Drill-down modal */}
      <AnimatePresence>
        {drillDown && (
          <DrillDownModal config={drillDown} onClose={() => setDrillDown(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
