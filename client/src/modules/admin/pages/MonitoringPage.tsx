import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, Cpu, AlertTriangle, CheckCircle, Clock, Zap,
  Database, RefreshCw, Wifi, WifiOff, TrendingUp,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";

interface MonitoringStats {
  platform: { totalReports: number; totalSOS: number; totalUsers: number };
  runtime: {
    totalRequests: number; errorRate: number; avgResponseTimeMs: number;
    p95ResponseTimeMs: number; requestsPerMinute: number; activeConnections: number; uptimeSeconds: number;
  };
  circuitBreakers: { name: string; state: string; failureCount: number; lastFailureAt: number | null }[];
  timestamp: string;
}

interface HealthDetailed {
  status: string;
  checks: Record<string, { status: string; detail?: string }>;
  metrics: MonitoringStats["runtime"];
  uptime: number;
}

interface MonitoringAlert { level: string; message: string }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { ok: "bg-green-100 text-green-700", degraded: "bg-yellow-100 text-yellow-700", down: "bg-red-100 text-red-700", CLOSED: "bg-green-100 text-green-700", OPEN: "bg-red-100 text-red-700", HALF_OPEN: "bg-yellow-100 text-yellow-700" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

function StatCard({ label, value, sub, icon: Icon, color = "text-blue-600" }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`w-6 h-6 ${color} opacity-70`} />
        </div>
      </CardContent>
    </Card>
  );
}

const CHAOS_EXPERIMENTS = [
  { id: "latency",    label: "High Latency",    desc: "Adds 2–5s delay",          color: "bg-orange-100 text-orange-700" },
  { id: "error_rate", label: "Error Injection",  desc: "20% of requests → 500",    color: "bg-red-100 text-red-700"    },
  { id: "memory",     label: "Memory Pressure",  desc: "Allocate ~50MB for 10s",   color: "bg-purple-100 text-purple-700" },
  { id: "db_slow",    label: "Slow DB",          desc: "Simulates DB timeout logs", color: "bg-yellow-100 text-yellow-700" },
];

export default function MonitoringPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [runningExp, setRunningExp] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<MonitoringStats>({
    queryKey: ["/api/monitoring/stats"],
    refetchInterval: 15_000,
  });

  const { data: health } = useQuery<HealthDetailed>({
    queryKey: ["/api/health/detailed"],
    refetchInterval: 30_000,
  });

  const { data: alertsData } = useQuery<{ alerts: MonitoringAlert[] }>({
    queryKey: ["/api/monitoring/alerts"],
    refetchInterval: 30_000,
  });

  const { data: chaosData } = useQuery<{ available: any[]; active: any[] }>({
    queryKey: ["/api/dev/chaos/experiments"],
    refetchInterval: 5000,
  });

  const chaosStartMutation = useMutation({
    mutationFn: (experiment: string) =>
      apiRequest("/api/dev/chaos/start", { method: "POST", body: JSON.stringify({ experiment, durationMs: 30_000 }) }),
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

  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
  const uptimeFmt = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const rt = stats?.runtime;
  const activeExp = chaosData?.active || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8 text-blue-600" />
              Monitoring & Observability
            </h1>
            <p className="text-muted-foreground mt-1">Real-time system metrics, health checks, and chaos engineering</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ["/api/monitoring/stats"] }); qc.invalidateQueries({ queryKey: ["/api/health/detailed"] }); }}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Active Alerts */}
        {alertsData?.alerts?.filter(a => a.level !== "info").map((al, i) => (
          <Alert key={i} className={al.level === "critical" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}>
            <AlertTriangle className={`w-4 h-4 ${al.level === "critical" ? "text-red-600" : "text-yellow-600"}`} />
            <AlertDescription className="font-medium">{al.message}</AlertDescription>
          </Alert>
        ))}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Requests"    value={fmt(rt?.totalRequests || 0)}   sub="all time"         icon={TrendingUp} color="text-blue-600" />
          <StatCard label="Error Rate"        value={`${rt?.errorRate?.toFixed(1) || 0}%`} sub="last window" icon={AlertTriangle} color={rt?.errorRate && rt.errorRate > 5 ? "text-red-600" : "text-green-600"} />
          <StatCard label="Avg Response"      value={`${rt?.avgResponseTimeMs || 0}ms`} sub={`P95: ${rt?.p95ResponseTimeMs || 0}ms`} icon={Clock} color="text-purple-600" />
          <StatCard label="Req / min"         value={rt?.requestsPerMinute || 0}    sub="last minute"      icon={Zap}       color="text-orange-600" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Reports"     value={fmt(stats?.platform.totalReports || 0)} sub="crisis reports"    icon={Database} color="text-indigo-600" />
          <StatCard label="SOS Alerts"        value={fmt(stats?.platform.totalSOS || 0)}     sub="all time"          icon={Wifi}     color="text-red-600" />
          <StatCard label="Registered Users"  value={fmt(stats?.platform.totalUsers || 0)}   sub="platform users"    icon={Cpu}      color="text-teal-600" />
          <StatCard label="Uptime"            value={uptimeFmt(rt?.uptimeSeconds || 0)}      sub="process uptime"    icon={CheckCircle} color="text-green-600" />
        </div>

        <Tabs defaultValue="health">
          <TabsList className="grid grid-cols-4 max-w-xl">
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="breakers">Circuit Breakers</TabsTrigger>
            <TabsTrigger value="chaos">Chaos Engineering</TabsTrigger>
            <TabsTrigger value="metrics">Raw Metrics</TabsTrigger>
          </TabsList>

          {/* HEALTH */}
          <TabsContent value="health" className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-semibold">System Status:</p>
              {health && <StatusBadge status={health.status} />}
            </div>
            {health?.checks && Object.entries(health.checks).map(([name, check]) => (
              <Card key={name}>
                <CardContent className="pt-3 pb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{name.replace(/([A-Z])/g, " $1")}</p>
                    {check.detail && <p className="text-xs text-muted-foreground">{check.detail}</p>}
                  </div>
                  <StatusBadge status={check.status} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* CIRCUIT BREAKERS */}
          <TabsContent value="breakers" className="space-y-3">
            {(!stats?.circuitBreakers || stats.circuitBreakers.length === 0) ? (
              <Card><CardContent className="text-center py-8 text-muted-foreground"><Wifi className="w-8 h-8 mx-auto mb-2 opacity-40" />No circuit breakers active yet — they are created when integration services are first called</CardContent></Card>
            ) : stats.circuitBreakers.map((cb) => (
              <Card key={cb.name}>
                <CardContent className="pt-3 pb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cb.name}</p>
                    <p className="text-xs text-muted-foreground">Failures: {cb.failureCount}{cb.lastFailureAt ? ` · Last: ${new Date(cb.lastFailureAt).toLocaleTimeString()}` : ""}</p>
                  </div>
                  <StatusBadge status={cb.state} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* CHAOS ENGINEERING */}
          <TabsContent value="chaos" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Chaos Engineering (Dev Only)</p>
                <p className="text-sm text-muted-foreground">Inject faults to test system resilience</p>
              </div>
              {activeExp.length > 0 && (
                <Button size="sm" variant="destructive" onClick={() => chaosStopMutation.mutate()}>Stop All</Button>
              )}
            </div>
            {activeExp.length > 0 && (
              <Alert className="border-orange-500 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="font-medium text-orange-700">
                  Active experiments: {activeExp.map((e: any) => e.name).join(", ")}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CHAOS_EXPERIMENTS.map(exp => {
                const isActive = activeExp.some((e: any) => e.name === exp.id);
                return (
                  <Card key={exp.id} className={isActive ? "border-orange-400" : ""}>
                    <CardContent className="pt-3 pb-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{exp.label}</p>
                          {isActive && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold animate-pulse">ACTIVE</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{exp.desc}</p>
                      </div>
                      <Button size="sm" variant={isActive ? "secondary" : "outline"}
                        disabled={chaosStartMutation.isPending || isActive}
                        onClick={() => chaosStartMutation.mutate(exp.id)}>
                        {isActive ? "Running" : "Run 30s"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* RAW PROMETHEUS METRICS */}
          <TabsContent value="metrics">
            <Card>
              <CardHeader><CardTitle className="text-sm">Prometheus-Format Metrics</CardTitle></CardHeader>
              <CardContent>
                <PrometheusMetrics />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PrometheusMetrics() {
  const { data, isLoading, refetch } = useQuery<string>({
    queryKey: ["/api/metrics-raw"],
    queryFn: async () => {
      const res = await fetch("/api/metrics");
      return res.text();
    },
    refetchInterval: false,
  });

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={() => refetch()}>
        <RefreshCw className="w-4 h-4 mr-2" />Refresh
      </Button>
      <pre className="bg-muted rounded p-3 text-xs overflow-x-auto max-h-96">
        {isLoading ? "Loading..." : data || "No data"}
      </pre>
    </div>
  );
}
