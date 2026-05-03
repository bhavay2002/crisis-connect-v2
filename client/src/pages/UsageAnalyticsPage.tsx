import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Key, Webhook, Activity, AlertCircle, CheckCircle,
  Clock, TrendingUp, Zap, Radio,
} from "lucide-react";

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="font-bold text-white">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Key Stats Row ──────────────────────────────────────────────────────────
function KeyStatRow({ stat, idx }: { stat: any; idx: number }) {
  const tierColors: Record<string, string> = {
    free:       "text-slate-400 bg-slate-800 border-slate-600",
    paid:       "text-blue-400 bg-blue-950/50 border-blue-600/30",
    enterprise: "text-purple-400 bg-purple-950/50 border-purple-600/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/40"
    >
      <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300">
        #{idx + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-xs font-mono text-blue-300">{stat.prefix}***</code>
          <span className="text-xs text-slate-400 truncate">{stat.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${tierColors[stat.tier] ?? tierColors.free}`}>
            {stat.tier}
          </span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${stat.utilizationPct >= 80 ? "bg-red-500" : stat.utilizationPct >= 50 ? "bg-yellow-500" : "bg-blue-500"}`}
            initial={{ width: 0 }}
            animate={{ width: `${stat.utilizationPct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-black text-white">{stat.requests.toLocaleString()}</div>
        <div className="text-xs text-slate-500">{stat.utilizationPct}% of limit</div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function UsageAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["api-analytics-platform"],
    queryFn: () => apiRequest("/api/analytics/platform"),
    refetchInterval: 60_000,
  });

  const summary       = data?.summary        ?? {};
  const webhookStats  = data?.webhookStats   ?? {};
  const keyStats      = data?.keyStats       ?? [];
  const topEndpoints  = data?.topEndpoints   ?? [];
  const dailyTrend    = data?.dailyTrend     ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <SectionHeader
          title="API Usage Analytics"
          description="Real-time platform usage insights — per-key request tracking, webhook delivery rates, and endpoint performance monitoring"
          live
        />

        {/* Platform-level stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total API Requests" value={(summary.totalRequests ?? 0).toLocaleString()} icon={Activity}    />
          <StatCard label="Error Rate"         value={`${summary.errorRate ?? 0}%`}                  icon={AlertCircle} severity="high" />
          <StatCard label="Avg Latency"        value={`${summary.avgLatencyMs ?? 0}ms`}              icon={Clock}       />
          <StatCard label="Active API Keys"    value={summary.activeKeys ?? 0}                       icon={Key}         />
        </div>

        {/* Request trend + webhook stats */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* 7-day request trend */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Daily API Requests (7 days)
              </h3>
            </div>
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reqG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="requests" name="requests" stroke="#6366f1" fill="url(#reqG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="errors"   name="errors"   stroke="#ef4444" fill="none"       strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
                {isLoading ? "Loading…" : "No usage data yet — create API keys and make requests to see analytics"}
              </div>
            )}
          </div>

          {/* Webhook health */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Webhook className="w-4 h-4 text-green-400" /> Webhook Health
            </h3>
            <div className="space-y-4">
              {/* Delivery success rate */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Success Rate</span>
                  <span className={`font-black ${(webhookStats.successRate ?? 100) >= 90 ? "text-green-400" : "text-red-400"}`}>
                    {webhookStats.successRate ?? 100}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${(webhookStats.successRate ?? 100) >= 90 ? "bg-green-500" : "bg-red-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${webhookStats.successRate ?? 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total Deliveries", value: webhookStats.totalDeliveries ?? 0,  color: "text-white"    },
                  { label: "Successful",        value: webhookStats.successful ?? 0,       color: "text-green-400" },
                  { label: "Failed",            value: webhookStats.failed ?? 0,           color: "text-red-400"  },
                  { label: "Avg Retries",       value: webhookStats.avgRetries ?? 1,       color: "text-yellow-400"},
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-slate-800/60 border border-slate-700/30 p-3 text-center">
                    <div className={`text-lg font-black ${s.color}`}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Active webhooks */}
              <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Radio className="w-3 h-3" /> Active Webhooks</span>
                  <span className="font-black text-white">{summary.activeWebhooks ?? 0} / {summary.totalWebhooks ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API keys + Top endpoints */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Per-key usage */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-purple-400" /> API Key Usage Ranking
            </h3>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse mb-2" />
              ))
            ) : keyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Key className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500">No API keys created yet</p>
                <p className="text-xs text-slate-600 mt-1">Go to Developer Platform to create your first key</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keyStats.slice(0, 8).map((k: any, i: number) => (
                  <KeyStatRow key={k.id} stat={k} idx={i} />
                ))}
              </div>
            )}
          </div>

          {/* Top endpoints */}
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-400" /> Top API Endpoints
            </h3>
            {topEndpoints.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-600 text-sm">No endpoint data</div>
            ) : (
              <>
                <div className="space-y-3">
                  {topEndpoints.map((e: any, i: number) => {
                    const max = topEndpoints[0]?.requests || 1;
                    const pct = Math.round(e.requests / max * 100);
                    const errPct = e.requests > 0 ? parseFloat((e.errors / e.requests * 100).toFixed(1)) : 0;
                    return (
                      <div key={e.endpoint} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <code className="text-blue-300 font-mono truncate max-w-[60%]">{e.endpoint}</code>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-300 font-bold">{e.requests.toLocaleString()}</span>
                            {errPct > 0 && <span className="text-red-400 text-xs">{errPct}% err</span>}
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ opacity: 1 - i * 0.15 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: i * 0.05 }}
                          />
                        </div>
                        <div className="text-xs text-slate-600">{e.avgLatencyMs}ms avg</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={topEndpoints} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <XAxis
                        dataKey="endpoint"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(e: string) => e.split(" ")[1]?.slice(-12) ?? e}
                      />
                      <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }: any) =>
                          active && payload?.[0] ? (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
                              <code className="text-blue-300">{payload[0].payload.endpoint}</code>
                              <p className="text-white font-bold">{payload[0].value.toLocaleString()} req</p>
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="requests" radius={[3, 3, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
