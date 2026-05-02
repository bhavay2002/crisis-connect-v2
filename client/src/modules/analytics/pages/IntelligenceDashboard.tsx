import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/queryClient";
import {
  Brain, Shield, TrendingUp, Clock, AlertTriangle, CheckCircle,
  Activity, MapPin, Zap, BarChart3, Users, Package
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b",
  low: "#22c55e", very_high: "#dc2626", very_low: "#86efac",
};

interface PeakHour {
  hour: number; label: string; incidentCount: number;
  severityScore: number; riskMultiplier: number;
}
interface SLACompliance {
  totalAlerts: number; resolvedAlerts: number; unresolved: number;
  avgResponseSeconds: number; slaBreakdown: Record<string, number>; slaComplianceRate: number;
}
interface ResourceEfficiency {
  resourceRequests: { total: number; fulfilled: number; pending: number; fulfillmentRate: number };
  aidOffers: { total: number; matched: number; matchRate: number };
  inventory: { totalItems: number; lowStockItems: number; criticalItems: number };
  overallEfficiencyScore: number;
}
interface SeasonalMonth {
  month: number; monthName: string; incidentCount: number;
  topDisasterType: string; severityBreakdown: Record<string, number>; typeBreakdown: Record<string, number>;
}
interface SystemHealth {
  systemStatus: "normal" | "warning" | "critical"; activeReports: number;
  activeSOS: number; criticalReports: number; totalUsers: number;
  anomaliesDetected: number; anomalies: any[]; uptime: number; checkedAt: string;
}
interface AnomalyResult { anomalies: any[]; checkedAt: string; }

export default function IntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: peakHours } = useQuery<{ peakHours: PeakHour[]; peakHour: number; totalIncidents: number }>({
    queryKey: ["/api/analytics/peak-hours"],
  });
  const { data: sla } = useQuery<SLACompliance>({
    queryKey: ["/api/analytics/sla-compliance"],
  });
  const { data: resources } = useQuery<ResourceEfficiency>({
    queryKey: ["/api/analytics/resource-efficiency"],
  });
  const { data: seasonal } = useQuery<{ seasonal: SeasonalMonth[]; peakMonth: string; dataPoints: number }>({
    queryKey: ["/api/analytics/seasonal-patterns"],
  });
  const { data: health } = useQuery<SystemHealth>({
    queryKey: ["/api/analytics/system-health"],
    refetchInterval: 30_000,
  });
  const { data: anomalies } = useQuery<AnomalyResult>({
    queryKey: ["/api/trust/anomalies"],
    refetchInterval: 60_000,
  });
  const { data: funnelData } = useQuery<any>({
    queryKey: ["/api/analytics/funnel"],
  });
  const { data: cohortData } = useQuery<any>({
    queryKey: ["/api/analytics/cohort"],
  });

  const statusColors = { normal: "text-green-500", warning: "text-yellow-500", critical: "text-red-500" };
  const statusIcon = health?.systemStatus === "critical" ? "🔴" :
    health?.systemStatus === "warning" ? "🟡" : "🟢";

  const peakData = peakHours?.peakHours?.map(h => ({
    hour: h.label, incidents: h.incidentCount, risk: Math.round(h.riskMultiplier * 10),
  })) ?? [];

  const slaData = sla ? [
    { name: "< 30s", count: sla.slaBreakdown.under30s || 0 },
    { name: "30-60s", count: sla.slaBreakdown.under60s || 0 },
    { name: "60-120s", count: sla.slaBreakdown.under120s || 0 },
    { name: "> 120s", count: sla.slaBreakdown.over120s || 0 },
  ] : [];

  const seasonalData = seasonal?.seasonal?.map(m => ({
    month: m.monthName, incidents: m.incidentCount, topType: m.topDisasterType,
  })) ?? [];

  const uptimeHours = health ? Math.floor(health.uptime / 3600) : 0;
  const uptimeMins = health ? Math.floor((health.uptime % 3600) / 60) : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-500" />
              </div>
              <h1 className="text-2xl font-black">Intelligence Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">Real-time analytics, SLA compliance, anomaly detection & predictive insights</p>
          </div>
          {health && (
            <div className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-semibold uppercase ${
              health.systemStatus === "critical" ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300" :
              health.systemStatus === "warning" ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-300" :
              "bg-green-50 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300"
            }`}>
              {statusIcon} System {health.systemStatus} · {uptimeHours}h {uptimeMins}m uptime
            </div>
          )}
        </div>

        {/* System Health Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2.5">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground">Active Reports</p>
            <p className="text-2xl font-black text-blue-500 mt-0.5">{health?.activeReports ?? "—"}</p>
          </div>
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-2.5">
              <Zap className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground">Active SOS</p>
            <p className="text-2xl font-black text-red-500 mt-0.5">{health?.activeSOS ?? "—"}</p>
          </div>
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-2.5">
              <Users className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-2xl font-black text-green-500 mt-0.5">{health?.totalUsers ?? "—"}</p>
          </div>
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground">Anomalies</p>
            <p className="text-2xl font-black text-yellow-500 mt-0.5">{health?.anomaliesDetected ?? "—"}</p>
          </div>
        </div>

        {anomalies?.anomalies && anomalies.anomalies.length > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-4">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
            <div className="pl-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm"><strong>{anomalies.anomalies.length} anomaly detected:</strong> {anomalies.anomalies[0]?.description}</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="sla" className="text-xs">SLA</TabsTrigger>
            <TabsTrigger value="peak" className="text-xs">Peak Hours</TabsTrigger>
            <TabsTrigger value="seasonal" className="text-xs">Seasonal</TabsTrigger>
            <TabsTrigger value="resources" className="text-xs">Resources</TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs">Funnel</TabsTrigger>
            <TabsTrigger value="cohort" className="text-xs">Cohorts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <h3 className="font-bold text-sm">SLA Compliance Rate</h3>
                </div>
                <p className="text-4xl font-black text-green-600">{sla?.slaComplianceRate ?? 0}%</p>
                <Progress value={sla?.slaComplianceRate ?? 0} className="mt-2 [&>div]:bg-green-500" />
                <p className="text-xs text-muted-foreground mt-1.5">Avg response: {sla?.avgResponseSeconds ?? 0}s</p>
              </div>
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-sm">Resource Efficiency</h3>
                </div>
                <p className="text-4xl font-black text-blue-600">{resources?.overallEfficiencyScore ?? 0}%</p>
                <Progress value={resources?.overallEfficiencyScore ?? 0} className="mt-2 [&>div]:bg-blue-500" />
                <p className="text-xs text-muted-foreground mt-1.5">Fulfillment: {resources?.resourceRequests.fulfillmentRate ?? 0}%</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="mb-3">
                <h3 className="font-bold text-sm">Peak Crisis Hours (24h Distribution)</h3>
                <p className="text-xs text-muted-foreground">Incident frequency by hour of day</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={peakData.filter((_, i) => i % 2 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="incidents" fill="#6366f1" name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="sla" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total SOS Alerts", value: sla?.totalAlerts ?? 0, color: "text-foreground" },
                { label: "Resolved",         value: sla?.resolvedAlerts ?? 0, color: "text-green-600" },
                { label: "Unresolved",       value: sla?.unresolved ?? 0, color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border bg-background p-4 text-center shadow-sm">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-4">Response Time Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={slaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Alerts" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-muted/60 rounded-xl border">
                <p className="text-xs font-semibold text-muted-foreground">SLA Target: Respond within 120 seconds</p>
                <p className="text-2xl font-black mt-1">{sla?.slaComplianceRate ?? 0}% <span className="text-sm font-normal text-muted-foreground">compliance</span></p>
                <p className="text-xs text-muted-foreground">Average response time: {sla?.avgResponseSeconds ?? 0}s</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="peak" className="mt-4">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <h3 className="font-bold text-sm">Incident Frequency by Hour</h3>
                </div>
                <p className="text-xs text-muted-foreground pl-9">
                  Peak hour: {peakHours?.peakHour !== undefined ? `${String(peakHours.peakHour).padStart(2, "0")}:00` : "—"} · Total: {peakHours?.totalIncidents ?? 0}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="incidents" fill="#6366f1" name="Incidents" />
                  <Bar dataKey="risk" fill="#f59e0b" name="Risk Index" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="seasonal" className="mt-4">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h3 className="font-bold text-sm">Monthly Incident Patterns</h3>
              </div>
              <p className="text-xs text-muted-foreground pl-9 mb-4">Peak month: {seasonal?.peakMonth ?? "—"} · Data points: {seasonal?.dataPoints ?? 0}</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
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
              <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2">
                {seasonal?.seasonal?.map(m => (
                  <div key={m.month} className="text-center p-2 bg-muted/60 rounded-lg border text-xs">
                    <p className="font-semibold">{m.monthName}</p>
                    <p className="text-base font-black">{m.incidentCount}</p>
                    <p className="text-muted-foreground truncate">{m.topDisasterType || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3">Resource Requests</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Total", value: resources?.resourceRequests.total ?? 0, color: "" },
                    { label: "Fulfilled", value: resources?.resourceRequests.fulfilled ?? 0, color: "text-green-600" },
                    { label: "Pending",   value: resources?.resourceRequests.pending ?? 0,   color: "text-yellow-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <Progress value={resources?.resourceRequests.fulfillmentRate ?? 0} className="mt-3 [&>div]:bg-green-500" />
                <p className="text-xs text-muted-foreground text-center mt-1">{resources?.resourceRequests.fulfillmentRate ?? 0}% fulfillment</p>
              </div>
              <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3">Aid Offers</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Offers</span><span className="font-bold">{resources?.aidOffers.total ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Matched</span><span className="font-bold text-green-600">{resources?.aidOffers.matched ?? 0}</span></div>
                </div>
                <Progress value={resources?.aidOffers.matchRate ?? 0} className="mt-3 [&>div]:bg-blue-500" />
                <p className="text-xs text-muted-foreground text-center mt-1">{resources?.aidOffers.matchRate ?? 0}% match rate</p>
              </div>
              <div className="rounded-2xl border bg-background p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3">Inventory</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Items</span><span className="font-bold">{resources?.inventory.totalItems ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><span className="font-bold text-yellow-600">{resources?.inventory.lowStockItems ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Critical (0 qty)</span><span className="font-bold text-red-600">{resources?.inventory.criticalItems ?? 0}</span></div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* §8 Funnel tab */}
          <TabsContent value="funnel" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h3 className="font-bold text-sm">Incident Conversion Funnel</h3>
                </div>
                <p className="text-xs text-muted-foreground pl-9 mb-4">Overall: <strong>{funnelData?.overallConversionRate ?? 0}%</strong> (submitted → resolved)</p>
                <div className="space-y-3">
                  {(funnelData?.funnel ?? []).map((stage: any) => (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold">{stage.stage}</span>
                        <span className="text-muted-foreground">{stage.count} ({stage.pct}%)</span>
                      </div>
                      <div className="h-5 rounded-lg overflow-hidden bg-muted">
                        <div className="h-full transition-all duration-500 rounded-lg" style={{ width: `${stage.pct}%`, backgroundColor: stage.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
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
                        <div className="h-full transition-all duration-500 rounded-lg" style={{ width: `${stage.pct}%`, backgroundColor: stage.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-4">Funnel Chart</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData?.funnel ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="pct" name="Conversion %" radius={[0, 4, 4, 0]}>
                    {(funnelData?.funnel ?? []).map((_entry: any, i: number) => (
                      <Cell key={i} fill={_entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* §8 Cohort tab */}
          <TabsContent value="cohort" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Users",       value: cohortData?.engagement?.totalUsers ?? 0,      color: "text-foreground" },
                { label: "Active Reporters",  value: cohortData?.engagement?.activeReporters ?? 0, color: "text-indigo-600" },
                { label: "Engagement Rate",   value: `${cohortData?.engagement?.engagementRate ?? 0}%`, color: "text-green-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border bg-background p-4 text-center shadow-sm">
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h3 className="font-bold text-sm">User Cohorts by Age</h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cohortData?.userCohorts ?? []} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70}
                        label={({ label, count }) => count > 0 ? `${label}: ${count}` : ""}>
                        {(cohortData?.userCohorts ?? []).map((_entry: any, i: number) => (
                          <Cell key={i} fill={_entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-1">Reports by Role</h3>
                <p className="text-xs text-muted-foreground mb-4">Average reports per user per role</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohortData?.reportsByRole ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="role" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="avgReports" name="Avg Reports" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-3">Role Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(cohortData?.roleBreakdown ?? []).map((rb: any) => (
                  <div key={rb.role} className="text-center p-3 rounded-xl bg-muted/50 border">
                    <p className="text-2xl font-black">{rb.count}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{rb.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
