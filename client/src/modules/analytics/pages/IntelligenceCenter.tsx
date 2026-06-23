import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeverityBadge } from "@/components/ds/SeverityBadge";
import { LiveIndicator } from "@/components/ds/LiveIndicator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Brain, BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Activity, MapPin, Zap, Users, Package, Clock, Shield, Target,
  Download, FileJson, FileSpreadsheet, X, ChevronRight, Building2,
  CloudRain, Loader2,
} from "lucide-react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ── colours ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

// ── helpers ────────────────────────────────────────────────────────────────
function convertToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(",")];
  for (const row of data) {
    rows.push(headers.map(h => {
      const v = row[h];
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
    }).join(","));
  }
  return rows.join("\n");
}
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Executive: city badge ──────────────────────────────────────────────────
function CityStatusBadge({ status }: { status: "STABLE" | "WARNING" | "CRITICAL" }) {
  const cfg = {
    STABLE:   { bg:"bg-green-950/60",  border:"border-green-500/40",  text:"text-green-300",  pulse:"bg-green-500"  },
    WARNING:  { bg:"bg-yellow-950/60", border:"border-yellow-500/40", text:"text-yellow-300", pulse:"bg-yellow-500" },
    CRITICAL: { bg:"bg-red-950/60",    border:"border-red-500/40",    text:"text-red-300",    pulse:"bg-red-500"    },
  }[status];
  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
      <div className="relative w-4 h-4 flex items-center justify-center">
        <div className={`absolute w-4 h-4 rounded-full ${cfg.pulse} opacity-30 animate-ping`} />
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.pulse}`} />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-widest leading-none mb-0.5">City Status</p>
        <p className={`text-xl font-black tracking-tight leading-none ${cfg.text}`}>{status}</p>
      </div>
    </div>
  );
}

// ── Executive: drill-down modal ────────────────────────────────────────────
function DrillDownModal({ config, onClose }: { config: { severity?: string; type?: string; label: string }; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["exec-drilldown", config],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "30" });
      if (config.severity) p.set("severity", config.severity);
      if (config.type) p.set("type", config.type);
      return apiRequest(`/api/executive/incidents?${p}`);
    },
  });
  const incidents = data?.incidents ?? [];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
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
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 capitalize shrink-0">{inc.status}</Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Executive: KPI card ────────────────────────────────────────────────────
function KpiCard({ label, value, unit, sub, icon: Icon, iconColor, iconBg, trend, onClick }: any) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={`rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 ${onClick ? "cursor-pointer hover:border-blue-500/40 transition-colors" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
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

function ExecTooltip({ active, payload, label }: any) {
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

// ── RISK level colours for forecasting ────────────────────────────────────
const RISK_COLORS: Record<string,string> = {
  very_low:"#22c55e", low:"#84cc16", medium:"#f59e0b", high:"#ef4444", very_high:"#dc2626",
};
const RISK_LABELS: Record<string,string> = {
  very_low:"Very Low", low:"Low", medium:"Medium", high:"High", very_high:"Very High",
};
const DISASTER_LABELS: Record<string,string> = {
  fire:"Fire", flood:"Flood", earthquake:"Earthquake", storm:"Storm",
  road_accident:"Road Accident", epidemic:"Epidemic", landslide:"Landslide",
  gas_leak:"Gas Leak", building_collapse:"Building Collapse",
  chemical_spill:"Chemical Spill", power_outage:"Power Outage",
  water_contamination:"Water Contamination", other:"Other",
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function IntelligenceCenter() {
  const [tab, setTab] = useState("operational");
  const { toast } = useToast();

  // ── Operational Analytics queries ─────────────────────────────────────
  const { data: opSummary }        = useQuery<any>({ queryKey: ["/api/analytics/summary"] });
  const { data: disasterFreq }     = useQuery<Record<string,number>>({ queryKey: ["/api/analytics/disaster-frequency"] });
  const { data: geoData }          = useQuery<any[]>({ queryKey: ["/api/analytics/geographic-impact"] });

  // ── Executive Briefing queries ────────────────────────────────────────
  const { data: execSummary, isLoading: execLoading } = useQuery<any>({
    queryKey: ["executive-summary"],
    queryFn: () => apiRequest("/api/executive/summary"),
    refetchInterval: 30_000,
  });
  const { data: trendsData }  = useQuery({ queryKey: ["executive-trends"],    queryFn: () => apiRequest("/api/executive/trends"),      refetchInterval: 60_000 });
  const { data: execPeakData }= useQuery({ queryKey: ["executive-peak"],      queryFn: () => apiRequest("/api/executive/peak-hours"),   refetchInterval: 120_000 });
  const { data: slaHistory }  = useQuery({ queryKey: ["executive-sla"],       queryFn: () => apiRequest("/api/executive/sla-history"),  refetchInterval: 120_000 });
  const [drillDown, setDrillDown] = useState<any>(null);

  // ── Trend Analysis queries ────────────────────────────────────────────
  const { data: peakHours }   = useQuery<any>({ queryKey: ["/api/analytics/peak-hours"] });
  const { data: slaData }     = useQuery<any>({ queryKey: ["/api/analytics/sla-compliance"] });
  const { data: seasonal }    = useQuery<any>({ queryKey: ["/api/analytics/seasonal-patterns"] });
  const { data: funnelData }  = useQuery<any>({ queryKey: ["/api/analytics/funnel"] });
  const { data: cohortData }  = useQuery<any>({ queryKey: ["/api/analytics/cohort"] });
  const { data: health }      = useQuery<any>({ queryKey: ["/api/analytics/system-health"], refetchInterval: 30_000 });

  // ── Forecasting queries ───────────────────────────────────────────────
  const { data: predictions, isLoading: predLoading } = useQuery<any>({ queryKey: ["/api/predictions"] });
  const { data: authUser } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const [genLoc, setGenLoc] = useState({ area: "", latitude: "", longitude: "" });
  const canGenerate = Boolean(authUser && ["ngo","admin","government","authority","super_admin"].includes(authUser.role || ""));
  const generateMutation = useMutation({
    mutationFn: (d: any) => apiRequest("/api/predictions/generate", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      toast({ title: "Predictions generated" });
      setGenLoc({ area: "", latitude: "", longitude: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Derived data ──────────────────────────────────────────────────────
  const freqData = disasterFreq
    ? Object.entries(disasterFreq).map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    : [];

  const peakBarData = peakHours?.peakHours?.map((h: any) => ({
    hour: h.label, incidents: h.incidentCount, risk: Math.round(h.riskMultiplier * 10),
  })) ?? [];

  const slaBarData = slaData ? [
    { name: "< 30s",   count: slaData.slaBreakdown?.under30s  || 0 },
    { name: "30–60s",  count: slaData.slaBreakdown?.under60s  || 0 },
    { name: "60–120s", count: slaData.slaBreakdown?.under120s || 0 },
    { name: "> 120s",  count: slaData.slaBreakdown?.over120s  || 0 },
  ] : [];

  const seasonalBarData = seasonal?.seasonal?.map((m: any) => ({
    month: m.monthName, incidents: m.incidentCount, topType: m.topDisasterType,
  })) ?? [];

  const execTrend = trendsData?.trend ?? [];
  const execPeak  = execPeakData?.peak ?? [];
  const execSLA   = slaHistory?.history ?? [];

  const OP_STATS = [
    { label: "Reports Submitted",   value: opSummary?.reportSubmitted  ?? "–", icon: AlertTriangle, color: "text-red-500",     bg: "bg-red-500/10"     },
    { label: "Reports Verified",    value: opSummary?.reportVerified   ?? "–", icon: CheckCircle,   color: "text-blue-500",    bg: "bg-blue-500/10"    },
    { label: "Reports Resolved",    value: opSummary?.reportResolved   ?? "–", icon: CheckCircle,   color: "text-green-500",   bg: "bg-green-500/10"   },
    { label: "Resources Requested", value: opSummary?.resourceRequested ?? "–", icon: Package,       color: "text-orange-500",  bg: "bg-orange-500/10"  },
    { label: "Resources Fulfilled", value: opSummary?.resourceFulfilled ?? "–", icon: Package,       color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Aid Offered",         value: opSummary?.aidOffered        ?? "–", icon: Users,         color: "text-purple-500",  bg: "bg-purple-500/10"  },
    { label: "Aid Delivered",       value: opSummary?.aidDelivered      ?? "–", icon: TrendingUp,    color: "text-teal-500",    bg: "bg-teal-500/10"    },
    { label: "Avg Response (min)",  value: opSummary?.avgResponseTime != null ? String(Math.round(opSummary.avgResponseTime)) : "–", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const uptimeH = health ? Math.floor(health.uptime / 3600) : 0;
  const uptimeM = health ? Math.floor((health.uptime % 3600) / 60) : 0;

  const predList = Array.isArray(predictions) ? predictions : (predictions?.predictions ?? []);
  const mapCenter: [number, number] = [20.5937, 78.9629];

  // ── After Action: resource efficiency ────────────────────────────────
  const { data: resources } = useQuery<any>({ queryKey: ["/api/analytics/resource-efficiency"] });

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Intelligence Center</h1>
            <p className="text-sm text-muted-foreground">
              Unified analytics, executive intelligence, trend analysis, forecasting &amp; after-action review
            </p>
          </div>
        </div>
        {health && (
          <div className={cn(
            "flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-semibold uppercase",
            health.systemStatus === "critical" ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300" :
            health.systemStatus === "warning"  ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-300" :
            "bg-green-50 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300"
          )}>
            {health.systemStatus === "critical" ? "🔴" : health.systemStatus === "warning" ? "🟡" : "🟢"}&nbsp;
            System {health.systemStatus} · {uptimeH}h {uptimeM}m
          </div>
        )}
      </div>

      {/* ── Top-level tabs ───────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-10 gap-0.5">
          <TabsTrigger value="operational"  className="text-xs px-4">Operational Analytics</TabsTrigger>
          <TabsTrigger value="executive"    className="text-xs px-4">Executive Briefing</TabsTrigger>
          <TabsTrigger value="trends"       className="text-xs px-4">Trend Analysis</TabsTrigger>
          <TabsTrigger value="forecasting"  className="text-xs px-4">Forecasting</TabsTrigger>
          <TabsTrigger value="afteraction"  className="text-xs px-4">After Action Reports</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — OPERATIONAL ANALYTICS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="operational" className="mt-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <h2 className="font-bold text-sm">Platform-wide performance metrics</h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" />Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadFile(JSON.stringify({ opSummary, disasterFreq, geoData }, null, 2), "analytics.json", "application/json")}>
                  <FileJson className="h-4 w-4 mr-2" />Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => freqData.length && downloadFile(convertToCSV(freqData, ["name","count"]), "disaster-frequency.csv", "text/csv")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {OP_STATS.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl border bg-background p-4">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", bg)}>
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-background p-5">
              <h3 className="font-bold text-sm mb-4">Disaster Type Frequency</h3>
              {freqData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={freqData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Reports" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border bg-background p-5">
              <h3 className="font-bold text-sm mb-4">Severity &amp; Location Breakdown</h3>
              {!geoData || geoData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const c: Record<string,number> = {};
                          geoData.forEach(r => { c[r.severity] = (c[r.severity]||0)+1; });
                          return Object.entries(c).map(([name,value]) => ({ name, value }));
                        })()}
                        cx="50%" cy="50%" outerRadius={70}
                        dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {["critical","high","medium","low"].map((_,i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {(() => {
                      const c: Record<string,number> = {};
                      geoData.forEach(r => { c[r.location] = (c[r.location]||0)+1; });
                      return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([loc,cnt]) => (
                        <div key={loc} className="text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="flex items-center gap-1 font-medium truncate">
                              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />{loc}
                            </span>
                            <span className="text-muted-foreground ml-1">{cnt}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${(cnt/geoData.length)*100}%` }} />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — EXECUTIVE BRIEFING
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="executive" className="mt-5">
          {execLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading executive summary…</p>
              </div>
            </div>
          ) : !execSummary ? (
            <div className="text-center py-20 text-muted-foreground">No executive data available</div>
          ) : (
            <div className="space-y-6">
              {/* Ribbon */}
              <div className="flex flex-wrap items-center gap-4">
                <CityStatusBadge status={execSummary.cityStatus} />
                <div className="flex items-center gap-4 ml-auto flex-wrap">
                  {[
                    { label: "SLA Compliance", value: `${execSummary.slaCompliance}%`, color: "text-emerald-400" },
                    { label: "Avg Response",   value: `${execSummary.avgResponseTime}s`, color: "text-blue-400" },
                    { label: "Responders",     value: execSummary.totalResponders, color: "text-slate-200" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      {i > 0 && <div className="w-px h-8 bg-slate-700" />}
                      <div className="text-center">
                        <div className={`text-xl font-black ${item.color}`}>{item.value}</div>
                        <div className="text-xs text-slate-500">{item.label}</div>
                      </div>
                    </div>
                  ))}
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="text-xs text-slate-500">Updated {new Date(execSummary.generatedAt).toLocaleTimeString()}</div>
                </div>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Active Incidents"       value={execSummary.activeIncidents}    icon={AlertTriangle} iconColor="text-orange-400" iconBg="bg-orange-900/30 border-orange-500/20"  trend={execSummary.incidentTrend} onClick={() => setDrillDown({ label: "Active Incidents" })} />
                <KpiCard label="Critical Incidents"    value={execSummary.criticalIncidents}   icon={Zap}           iconColor="text-red-400"    iconBg="bg-red-900/30 border-red-500/20"          onClick={() => setDrillDown({ severity: "critical", label: "Critical Incidents" })} />
                <KpiCard label="Resolved (24h)"        value={execSummary.resolvedLast24h}     icon={CheckCircle}   iconColor="text-green-400"  iconBg="bg-green-900/30 border-green-500/20" />
                <KpiCard label="Responder Utilization" value={`${execSummary.responderUtilization}%`} sub={`${execSummary.activeSOS} active SOS`} icon={Users} iconColor="text-purple-400" iconBg="bg-purple-900/30 border-purple-500/20" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-400" /> Incident Trend (7 days)
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {[["#3b82f6","Total"],["#ef4444","Critical"],["#22c55e","Resolved"]].map(([c,l]) => (
                        <span key={l} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                  {execTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={execTrend} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="iG1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                          <linearGradient id="iG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ExecTooltip />} />
                        <Area type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" fill="url(#iG1)" strokeWidth={2} />
                        <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fill="url(#iG2)" strokeWidth={2} />
                        <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fill="none"      strokeWidth={2} strokeDasharray="4 2" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No trend data</div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
                    <Target className="w-4 h-4 text-emerald-400" /> SLA Compliance (4w)
                  </h3>
                  {execSLA.length > 0 ? (
                    <div className="space-y-3">
                      {execSLA.map((w: any) => {
                        const color = w.compliance >= 90 ? "bg-green-500" : w.compliance >= 75 ? "bg-yellow-500" : "bg-red-500";
                        const tc = w.compliance >= 90 ? "text-green-400" : w.compliance >= 75 ? "text-yellow-400" : "text-red-400";
                        return (
                          <div key={w.week}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-400">{w.label}</span>
                              <span className={`font-bold ${tc}`}>{w.compliance}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div className={`h-full rounded-full ${color}`} initial={{ width:0 }} animate={{ width:`${w.compliance}%` }} transition={{ duration:0.8, ease:"easeOut" }} />
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{w.met}/{w.total} met target</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No SLA data yet</div>
                  )}
                </div>
              </div>

              {/* Bottom: Severity + Peak + Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-yellow-400" /> Severity Breakdown
                  </h3>
                  <div className="space-y-3">
                    {(["critical","high","medium","low"] as const).map(sev => {
                      const count = execSummary.severityBreakdown?.[sev] ?? 0;
                      const total = Object.values(execSummary.severityBreakdown ?? {}).reduce((a:number,b:any)=>a+b,0)||1;
                      const pct = Math.round(count/total*100);
                      const colors = { critical:{bar:"bg-red-500",text:"text-red-400"}, high:{bar:"bg-orange-500",text:"text-orange-400"}, medium:{bar:"bg-yellow-500",text:"text-yellow-400"}, low:{bar:"bg-green-500",text:"text-green-400"} };
                      return (
                        <div key={sev} className="cursor-pointer" onClick={() => setDrillDown({ severity:sev, label:`${sev.charAt(0).toUpperCase()+sev.slice(1)} Incidents` })}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`font-semibold capitalize ${colors[sev].text}`}>{sev}</span>
                            <span className="text-slate-300 font-bold">{count} <span className="text-slate-500">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div className={`h-full rounded-full ${colors[sev].bar}`} initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.7,ease:"easeOut"}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-600 mt-3">Click to drill down</p>
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" /> Peak Crisis Hours
                  </h3>
                  {execPeak.length > 0 ? (
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={execPeak} margin={{ top:0, right:0, left:-30, bottom:0 }}>
                        <XAxis dataKey="hour" tick={{ fill:"#64748b", fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={(h:number)=>h%6===0?`${h}h`:""} />
                        <YAxis tick={{ fill:"#64748b", fontSize:9 }} axisLine={false} tickLine={false} />
                        <Tooltip content={({active,payload}:any)=>active&&payload?.[0]?(<div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"><span className="text-slate-300">{payload[0].payload.label}: </span><span className="font-bold text-white">{payload[0].value}</span></div>):null} />
                        <Bar dataKey="count" radius={[2,2,0,0]}>
                          {execPeak.map((e:any)=><Cell key={e.hour} fill={e.intensity>=0.8?"#ef4444":e.intensity>=0.5?"#f97316":e.intensity>=0.3?"#eab308":"#475569"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-36 flex items-center justify-center text-slate-600 text-sm">No data</div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" /> Top Incident Types
                  </h3>
                  <div className="space-y-2.5">
                    {(execSummary.typeBreakdown ?? []).slice(0,6).map(([type,count]:any) => {
                      const total = (execSummary.typeBreakdown??[]).reduce((a:number,[,c]:any)=>a+c,0)||1;
                      const pct = Math.round(count/total*100);
                      return (
                        <div key={type} className="cursor-pointer" onClick={()=>setDrillDown({type,label:`${type.replace(/_/g," ")} Incidents`})}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 capitalize">{type.replace(/_/g," ")}</span>
                            <span className="text-slate-400">{count} <span className="text-slate-600">({pct}%)</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full bg-sky-500" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.7,ease:"easeOut"}} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {drillDown && <DrillDownModal config={drillDown} onClose={() => setDrillDown(null)} />}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — TREND ANALYSIS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="trends" className="mt-5 space-y-5">
          {/* SLA + Efficiency summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-background p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                </div>
                <h3 className="font-bold text-sm">SLA Compliance Rate</h3>
              </div>
              <p className="text-4xl font-black text-green-600">{slaData?.slaComplianceRate ?? 0}%</p>
              <Progress value={slaData?.slaComplianceRate ?? 0} className="mt-2 [&>div]:bg-green-500" />
              <p className="text-xs text-muted-foreground mt-1.5">Avg response: {slaData?.avgResponseSeconds ?? 0}s · Target: &lt;120s</p>
            </div>
            <div className="rounded-2xl border bg-background p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <h3 className="font-bold text-sm">Resource Efficiency</h3>
              </div>
              <p className="text-4xl font-black text-blue-600">{resources?.overallEfficiencyScore ?? 0}%</p>
              <Progress value={resources?.overallEfficiencyScore ?? 0} className="mt-2 [&>div]:bg-blue-500" />
              <p className="text-xs text-muted-foreground mt-1.5">Fulfillment rate: {resources?.resourceRequests?.fulfillmentRate ?? 0}%</p>
            </div>
          </div>

          {/* Peak hours */}
          <div className="rounded-2xl border bg-background p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <h3 className="font-bold text-sm">Incident Frequency by Hour of Day</h3>
            </div>
            <p className="text-xs text-muted-foreground pl-9 mb-4">
              Peak: {peakHours?.peakHour !== undefined ? `${String(peakHours.peakHour).padStart(2,"0")}:00` : "—"} · Total: {peakHours?.totalIncidents ?? 0}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="incidents" fill="#6366f1" name="Incidents" />
                <Bar dataKey="risk" fill="#f59e0b" name="Risk Index" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Response time distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-background p-5">
              <h3 className="font-bold text-sm mb-4">Response Time Distribution (SLA Breakdown)</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Total SOS",  value: slaData?.totalAlerts   ?? 0, color: "" },
                  { label: "Resolved",   value: slaData?.resolvedAlerts ?? 0, color: "text-green-600" },
                  { label: "Unresolved", value: slaData?.unresolved     ?? 0, color: "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={slaBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Alerts" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Seasonal patterns */}
            <div className="rounded-2xl border bg-background p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h3 className="font-bold text-sm">Monthly Incident Patterns</h3>
              </div>
              <p className="text-xs text-muted-foreground pl-9 mb-4">
                Peak month: {seasonal?.peakMonth ?? "—"} · Data points: {seasonal?.dataPoints ?? 0}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={seasonalBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 text-xs shadow-sm">
                          <p className="font-bold">{d.month}</p>
                          <p>Incidents: {d.incidents}</p>
                          <p>Top type: {d.topType}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Line type="monotone" dataKey="incidents" stroke="#6366f1" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly breakdown pills */}
          {seasonal?.seasonal && (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {seasonal.seasonal.map((m: any) => (
                <div key={m.month} className="text-center p-2 bg-muted/60 rounded-lg border text-xs">
                  <p className="font-semibold">{m.monthName}</p>
                  <p className="text-base font-black">{m.incidentCount}</p>
                  <p className="text-muted-foreground truncate">{m.topDisasterType || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4 — FORECASTING
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="forecasting" className="mt-5 space-y-5">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-500" />
            <h2 className="font-bold text-sm">AI-powered disaster forecasting using historical data &amp; weather patterns</h2>
          </div>

          {canGenerate && (
            <div className="rounded-2xl border bg-background overflow-hidden">
              <div className="h-1 bg-blue-600" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <h2 className="font-black text-sm">Generate New Predictions</h2>
                  <span className="text-xs text-muted-foreground">Analyze an area to forecast potential disasters</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="fc-area">Area Name</Label>
                    <Input id="fc-area" placeholder="e.g., Mumbai, Maharashtra" value={genLoc.area} onChange={e=>setGenLoc(p=>({...p,area:e.target.value}))} />
                  </div>
                  <div>
                    <Label htmlFor="fc-lat">Latitude</Label>
                    <Input id="fc-lat" type="number" step="any" placeholder="19.076" value={genLoc.latitude} onChange={e=>setGenLoc(p=>({...p,latitude:e.target.value}))} />
                  </div>
                  <div>
                    <Label htmlFor="fc-lng">Longitude</Label>
                    <Input id="fc-lng" type="number" step="any" placeholder="72.8777" value={genLoc.longitude} onChange={e=>setGenLoc(p=>({...p,longitude:e.target.value}))} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={()=>{
                    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>setGenLoc(p=>({...p,latitude:String(pos.coords.latitude),longitude:String(pos.coords.longitude)})));
                  }} variant="outline" size="sm">Use My Location</Button>
                  <Button onClick={()=>generateMutation.mutate(genLoc)} disabled={generateMutation.isPending||!genLoc.area||!genLoc.latitude||!genLoc.longitude} size="sm">
                    {generateMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Generate Predictions
                  </Button>
                </div>
              </div>
            </div>
          )}

          {predLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : predList.length === 0 ? (
            <div className="rounded-2xl border bg-background p-10 text-center text-muted-foreground">
              <CloudRain className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No predictions available yet.</p>
              {canGenerate && <p className="text-xs mt-1">Use the form above to generate predictions for an area.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Map */}
              <div className="rounded-2xl border bg-background overflow-hidden" style={{ height: 400 }}>
                <MapContainer center={mapCenter} zoom={5} style={{ height:"100%", width:"100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                  {predList.filter((p:any)=>p.latitude&&p.longitude).map((pred:any) => (
                    <Circle
                      key={pred.id}
                      center={[parseFloat(pred.latitude), parseFloat(pred.longitude)]}
                      radius={pred.riskRadius ? pred.riskRadius*1000 : 20000}
                      pathOptions={{ color: RISK_COLORS[pred.riskLevel]||"#888", fillOpacity:0.2 }}
                    >
                      <Popup>
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold">{pred.area}</p>
                          <p>Type: {DISASTER_LABELS[pred.disasterType]||pred.disasterType}</p>
                          <p>Risk: {RISK_LABELS[pred.riskLevel]||pred.riskLevel}</p>
                          <p>Confidence: {pred.confidence}%</p>
                        </div>
                      </Popup>
                    </Circle>
                  ))}
                </MapContainer>
              </div>

              {/* Prediction list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {predList.slice(0,20).map((pred:any) => (
                  <div key={pred.id} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-sm">{pred.area}</p>
                        <p className="text-xs text-muted-foreground">{DISASTER_LABELS[pred.disasterType]||pred.disasterType}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: RISK_COLORS[pred.riskLevel]+"22", color: RISK_COLORS[pred.riskLevel] }}>
                        {RISK_LABELS[pred.riskLevel]||pred.riskLevel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Confidence: <strong className="text-foreground">{pred.confidence}%</strong></span>
                      <span>Probability: <strong className="text-foreground">{pred.probability}%</strong></span>
                    </div>
                    {pred.factors && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pred.factors.slice(0,3).map((f:string,i:number)=>(
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5 — AFTER ACTION REPORTS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="afteraction" className="mt-5 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="font-bold text-sm">Post-incident analysis, conversion funnels &amp; resource review</h2>
          </div>

          {/* Funnel row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-background p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h3 className="font-bold text-sm">Incident Conversion Funnel</h3>
              </div>
              <p className="text-xs text-muted-foreground pl-9 mb-4">
                Overall: <strong>{funnelData?.overallConversionRate ?? 0}%</strong> (submitted → resolved)
              </p>
              <div className="space-y-3">
                {(funnelData?.funnel ?? []).map((stage: any) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">{stage.stage}</span>
                      <span className="text-muted-foreground">{stage.count} ({stage.pct}%)</span>
                    </div>
                    <div className="h-5 rounded-lg overflow-hidden bg-muted">
                      <div className="h-full rounded-lg transition-all duration-500" style={{ width:`${stage.pct}%`, backgroundColor:stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h3 className="font-bold text-sm">SOS Resolution Funnel</h3>
              </div>
              <div className="space-y-3">
                {(funnelData?.sosFunnel ?? []).map((stage: any) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">{stage.stage}</span>
                      <span className="text-muted-foreground">{stage.count} ({stage.pct}%)</span>
                    </div>
                    <div className="h-5 rounded-lg overflow-hidden bg-muted">
                      <div className="h-full rounded-lg transition-all duration-500" style={{ width:`${stage.pct}%`, backgroundColor:stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal funnel chart */}
          <div className="rounded-2xl border bg-background p-5">
            <h3 className="font-bold text-sm mb-4">Funnel Conversion Chart</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData?.funnel ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0,100]} tickFormatter={(v)=>`${v}%`} tick={{ fontSize:11 }} />
                <YAxis type="category" dataKey="stage" width={140} tick={{ fontSize:11 }} />
                <Tooltip formatter={(v:number)=>`${v}%`} />
                <Bar dataKey="pct" name="Conversion %" radius={[0,4,4,0]}>
                  {(funnelData?.funnel ?? []).map((_e:any,i:number)=>(
                    <Cell key={i} fill={_e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Resources review */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-background p-4">
              <h3 className="font-bold text-sm mb-3">Resource Requests</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label:"Total",     value: resources?.resourceRequests?.total      ?? 0, color:"" },
                  { label:"Fulfilled", value: resources?.resourceRequests?.fulfilled   ?? 0, color:"text-green-600" },
                  { label:"Pending",   value: resources?.resourceRequests?.pending     ?? 0, color:"text-yellow-600" },
                ].map(({label,value,color})=>(
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
              <Progress value={resources?.resourceRequests?.fulfillmentRate ?? 0} className="mt-3 [&>div]:bg-green-500" />
              <p className="text-xs text-muted-foreground text-center mt-1">{resources?.resourceRequests?.fulfillmentRate ?? 0}% fulfillment</p>
            </div>

            <div className="rounded-2xl border bg-background p-4">
              <h3 className="font-bold text-sm mb-3">Aid Offers</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Offers</span><span className="font-bold">{resources?.aidOffers?.total ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Matched</span><span className="font-bold text-green-600">{resources?.aidOffers?.matched ?? 0}</span></div>
              </div>
              <Progress value={resources?.aidOffers?.matchRate ?? 0} className="mt-3 [&>div]:bg-blue-500" />
              <p className="text-xs text-muted-foreground text-center mt-1">{resources?.aidOffers?.matchRate ?? 0}% match rate</p>
            </div>

            <div className="rounded-2xl border bg-background p-4">
              <h3 className="font-bold text-sm mb-3">Inventory Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Items</span><span className="font-bold">{resources?.inventory?.totalItems ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><span className="font-bold text-yellow-600">{resources?.inventory?.lowStockItems ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Critical (0 qty)</span><span className="font-bold text-red-600">{resources?.inventory?.criticalItems ?? 0}</span></div>
              </div>
            </div>
          </div>

          {/* Cohort analysis */}
          {cohortData && (
            <div className="rounded-2xl border bg-background p-5">
              <h3 className="font-bold text-sm mb-4">User Cohort Retention</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label:"Active Users",   value: cohortData?.activeUsers   ?? 0, color:"text-blue-600" },
                  { label:"New (30d)",      value: cohortData?.newUsers30d   ?? 0, color:"text-green-600" },
                  { label:"Churn Rate",     value: `${cohortData?.churnRate ?? 0}%`, color:"text-red-600" },
                ].map(({label,value,color})=>(
                  <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {cohortData?.cohorts && (
                <div className="space-y-2">
                  {cohortData.cohorts.map((c:any)=>(
                    <div key={c.cohort} className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-xs text-muted-foreground flex-shrink-0">{c.cohort}</span>
                      <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                        <div className="h-full bg-blue-500/70 rounded-lg flex items-center px-2" style={{ width:`${c.retentionRate}%` }}>
                          <span className="text-xs font-bold text-white">{c.retentionRate}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">{c.activeUsers}/{c.totalUsers}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
