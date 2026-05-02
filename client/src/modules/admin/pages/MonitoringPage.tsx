import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Cpu, AlertTriangle, CheckCircle, Clock, Zap,
  Database, RefreshCw, Wifi, TrendingUp, Server, FlaskConical,
} from "lucide-react";

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
interface MonitoringAlert { level: string; message: string }

const STATUS_COLORS: Record<string, string> = {
  ok:        "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  degraded:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  down:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  CLOSED:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  OPEN:      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  HALF_OPEN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
};
const CHAOS_EXPERIMENTS = [
  { id: "latency",    label: "High Latency",    desc: "Adds 2–5s delay to all requests",  icon: "⏱" },
  { id: "error_rate", label: "Error Injection",  desc: "20% of requests return HTTP 500",  icon: "💥" },
  { id: "memory",     label: "Memory Pressure",  desc: "Allocate ~50MB for 10 seconds",    icon: "🧠" },
  { id: "db_slow",    label: "Slow DB",          desc: "Simulates database timeout logs",  icon: "🐢" },
];

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
const uptimeFmt = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

export default function MonitoringPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [runningExp, setRunningExp] = useState<string | null>(null);

  const { data: stats } = useQuery<MonitoringStats>({ queryKey: ["/api/monitoring/stats"], refetchInterval: 15_000 });
  const { data: health } = useQuery<HealthDetailed>({ queryKey: ["/api/health/detailed"], refetchInterval: 30_000 });
  const { data: alertsData } = useQuery<{ alerts: MonitoringAlert[] }>({ queryKey: ["/api/monitoring/alerts"], refetchInterval: 30_000 });
  const { data: chaosData } = useQuery<{ available: any[]; active: any[] }>({ queryKey: ["/api/dev/chaos/experiments"], refetchInterval: 5000 });

  const chaosStartMutation = useMutation({
    mutationFn: (experiment: string) => apiRequest("/api/dev/chaos/start", { method: "POST", body: JSON.stringify({ experiment, durationMs: 30_000 }) }),
    onSuccess: (_d: any, experiment) => {
      setRunningExp(experiment);
      toast({ title: `Chaos experiment '${experiment}' started for 30s` });
      qc.invalidateQueries({ queryKey: ["/api/dev/chaos/experiments"] });
      setTimeout(() => { setRunningExp(null); qc.invalidateQueries({ queryKey: ["/api/dev/chaos/experiments"] }); }, 32_000);
    },
  });
  const chaosStopMutation = useMutation({
    mutationFn: () => apiRequest("/api/dev/chaos/stop", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { setRunningExp(null); toast({ title: "All experiments stopped" }); qc.invalidateQueries({ queryKey: ["/api/dev/chaos/experiments"] }); },
  });

  const rt = stats?.runtime;
  const activeExp = chaosData?.active || [];
  const activeAlerts = alertsData?.alerts?.filter(a => a.level !== "info") || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <h1 className="text-2xl font-black">Monitoring & Observability</h1>
            </div>
            <p className="text-sm text-muted-foreground">Real-time metrics, health checks, circuit breakers, and chaos engineering</p>
          </div>
          <Button size="sm" variant="outline" className="h-8"
            onClick={() => { qc.invalidateQueries({ queryKey: ["/api/monitoring/stats"] }); qc.invalidateQueries({ queryKey: ["/api/health/detailed"] }); }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
        </div>

        {/* Active alert banners */}
        {activeAlerts.map((al, i) => (
          <div key={i} className={`relative overflow-hidden rounded-xl border p-4 ${al.level === "critical" ? "border-red-500/30 bg-red-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${al.level === "critical" ? "bg-red-500" : "bg-yellow-500"}`} />
            <div className="flex items-center gap-3 pl-3">
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${al.level === "critical" ? "text-red-500" : "text-yellow-500"}`} />
              <p className={`text-sm font-semibold ${al.level === "critical" ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>{al.message}</p>
            </div>
          </div>
        ))}

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Requests",  value: fmt(rt?.totalRequests || 0),           sub: "all time",             icon: TrendingUp,  color: "text-blue-500",   bg: "bg-blue-500/10"   },
            { label: "Error Rate",      value: `${rt?.errorRate?.toFixed(1) || 0}%`,  sub: "last window",          icon: AlertTriangle, color: rt?.errorRate && rt.errorRate > 5 ? "text-red-500" : "text-green-500", bg: rt?.errorRate && rt.errorRate > 5 ? "bg-red-500/10" : "bg-green-500/10" },
            { label: "Avg Response",    value: `${rt?.avgResponseTimeMs || 0}ms`,     sub: `P95: ${rt?.p95ResponseTimeMs || 0}ms`, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
            { label: "Req / min",       value: rt?.requestsPerMinute || 0,            sub: "last minute",          icon: Zap,         color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "Total Reports",   value: fmt(stats?.platform.totalReports || 0), sub: "crisis reports",      icon: Database,    color: "text-indigo-500", bg: "bg-indigo-500/10" },
            { label: "SOS Alerts",      value: fmt(stats?.platform.totalSOS || 0),    sub: "all time",             icon: Wifi,        color: "text-red-500",    bg: "bg-red-500/10"    },
            { label: "Registered Users",value: fmt(stats?.platform.totalUsers || 0),  sub: "platform users",      icon: Cpu,         color: "text-teal-500",   bg: "bg-teal-500/10"   },
            { label: "Uptime",          value: uptimeFmt(rt?.uptimeSeconds || 0),     sub: "process uptime",       icon: CheckCircle, color: "text-green-500",  bg: "bg-green-500/10"  },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border bg-background p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-black mt-0.5 ${color}`}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="health">
          <TabsList className="h-9">
            <TabsTrigger value="health" className="text-xs">Health Checks</TabsTrigger>
            <TabsTrigger value="breakers" className="text-xs">Circuit Breakers</TabsTrigger>
            <TabsTrigger value="chaos" className="text-xs flex items-center gap-1.5">
              Chaos Engineering
              {activeExp.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">Prometheus</TabsTrigger>
          </TabsList>

          {/* HEALTH */}
          <TabsContent value="health" className="mt-4 space-y-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Server className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">System Status</span>
              {health && <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[health.status]}`}>{health.status}</span>}
            </div>
            {health?.checks && Object.entries(health.checks).map(([name, check]) => (
              <div key={name} className={`flex items-center justify-between p-3.5 rounded-xl border bg-background shadow-sm ${check.status === "down" ? "border-red-300 dark:border-red-700" : check.status === "degraded" ? "border-yellow-300 dark:border-yellow-700" : ""}`}>
                <div>
                  <p className="font-semibold text-sm capitalize">{name.replace(/([A-Z])/g, " $1")}</p>
                  {check.detail && <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[check.status]}`}>{check.status}</span>
              </div>
            ))}
          </TabsContent>

          {/* CIRCUIT BREAKERS */}
          <TabsContent value="breakers" className="mt-4 space-y-2">
            {(!stats?.circuitBreakers || stats.circuitBreakers.length === 0) ? (
              <div className="rounded-2xl border bg-background p-12 text-center">
                <Wifi className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No circuit breakers registered</p>
                <p className="text-xs text-muted-foreground mt-1">They activate when external integrations are first called</p>
              </div>
            ) : stats.circuitBreakers.map((cb) => (
              <div key={cb.name} className={`flex items-center justify-between p-3.5 rounded-xl border bg-background shadow-sm ${cb.state === "OPEN" ? "border-red-300 dark:border-red-700" : ""}`}>
                <div>
                  <p className="font-semibold text-sm">{cb.name}</p>
                  <p className="text-xs text-muted-foreground">Failures: {cb.failureCount}{cb.lastFailureAt ? ` · Last: ${new Date(cb.lastFailureAt).toLocaleTimeString()}` : ""}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[cb.state]}`}>{cb.state}</span>
              </div>
            ))}
          </TabsContent>

          {/* CHAOS ENGINEERING */}
          <TabsContent value="chaos" className="mt-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FlaskConical className="w-4 h-4 text-orange-500" />
                  <p className="font-bold">Chaos Engineering</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 font-medium">Dev only</span>
                </div>
                <p className="text-sm text-muted-foreground">Inject controlled faults to test system resilience</p>
              </div>
              {activeExp.length > 0 && (
                <Button size="sm" variant="destructive" onClick={() => chaosStopMutation.mutate()}>Stop All</Button>
              )}
            </div>

            {activeExp.length > 0 && (
              <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                <div className="flex items-center gap-3 pl-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    Active: {activeExp.map((e: any) => e.name).join(", ")}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHAOS_EXPERIMENTS.map(exp => {
                const isActive = activeExp.some((e: any) => e.name === exp.id);
                return (
                  <div key={exp.id} className={`rounded-2xl border bg-background p-4 shadow-sm transition-all ${isActive ? "border-orange-400 dark:border-orange-600" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{exp.icon}</span>
                          <p className="font-semibold text-sm">{exp.label}</p>
                          {isActive && <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 px-2 py-0.5 rounded-full font-bold animate-pulse">ACTIVE</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{exp.desc}</p>
                      </div>
                      <Button size="sm" variant={isActive ? "secondary" : "outline"} className="flex-shrink-0 h-8"
                        disabled={chaosStartMutation.isPending || isActive}
                        onClick={() => chaosStartMutation.mutate(exp.id)}>
                        {isActive ? "Running…" : "Run 30s"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* PROMETHEUS */}
          <TabsContent value="metrics" className="mt-4">
            <PrometheusMetrics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PrometheusMetrics() {
  const { data, isLoading, refetch } = useQuery<string>({
    queryKey: ["/api/metrics-raw"],
    queryFn: async () => { const res = await fetch("/api/metrics"); return res.text(); },
    refetchInterval: false,
  });
  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm">Prometheus-format metrics</p>
        <Button size="sm" variant="outline" className="h-8" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh</Button>
      </div>
      <pre className="bg-muted rounded-xl p-4 text-xs overflow-x-auto max-h-96 leading-relaxed">
        {isLoading ? "Loading…" : data || "No data"}
      </pre>
    </div>
  );
}
