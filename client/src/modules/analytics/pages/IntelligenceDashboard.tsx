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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-600" />
              Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time analytics, SLA compliance, anomaly detection & predictive insights
            </p>
          </div>
          {health && (
            <div className="text-right">
              <p className={`text-lg font-bold ${statusColors[health.systemStatus]}`}>
                {statusIcon} System {health.systemStatus.toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground">Uptime: {uptimeHours}h {uptimeMins}m</p>
            </div>
          )}
        </div>

        {/* System Health Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{health?.activeReports ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Active Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{health?.activeSOS ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Active SOS</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{health?.totalUsers ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{health?.anomaliesDetected ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Anomalies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {anomalies?.anomalies && anomalies.anomalies.length > 0 && (
          <Alert className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <strong>{anomalies.anomalies.length} anomaly detected:</strong>{" "}
              {anomalies.anomalies[0]?.description}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
            <TabsTrigger value="peak">Peak Hours</TabsTrigger>
            <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="cohort">Cohorts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    SLA Compliance Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {sla?.slaComplianceRate ?? 0}%
                  </div>
                  <Progress value={sla?.slaComplianceRate ?? 0} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Avg response: {sla?.avgResponseSeconds ?? 0}s
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    Resource Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">
                    {resources?.overallEfficiencyScore ?? 0}%
                  </div>
                  <Progress value={resources?.overallEfficiencyScore ?? 0} className="mt-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Fulfillment: {resources?.resourceRequests.fulfillmentRate ?? 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Peak Crisis Hours (24h Distribution)</CardTitle>
                <CardDescription>Incident frequency by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={peakData.filter((_, i) => i % 2 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="incidents" fill="#6366f1" name="Incidents" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold">{sla?.totalAlerts ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total SOS Alerts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{sla?.resolvedAlerts ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{sla?.unresolved ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Unresolved</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={slaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" name="Alerts" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    SLA Target: Respond within 120 seconds
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {sla?.slaComplianceRate ?? 0}%
                    <span className="text-sm font-normal text-muted-foreground ml-2">compliance</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Average response time: {sla?.avgResponseSeconds ?? 0}s
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="peak" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Incident Frequency by Hour
                </CardTitle>
                <CardDescription>
                  Peak hour: {peakHours?.peakHour !== undefined
                    ? `${String(peakHours.peakHour).padStart(2, "0")}:00`
                    : "—"} | Total incidents: {peakHours?.totalIncidents ?? 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seasonal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Monthly Incident Patterns
                </CardTitle>
                <CardDescription>
                  Peak month: {seasonal?.peakMonth ?? "—"} | Data points: {seasonal?.dataPoints ?? 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded p-2 text-xs">
                            <p className="font-medium">{d.month}</p>
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
                    <div key={m.month} className="text-center p-2 bg-muted rounded text-xs">
                      <p className="font-medium">{m.monthName}</p>
                      <p className="text-lg font-bold">{m.incidentCount}</p>
                      <Badge variant="outline" className="text-xs">{m.topDisasterType || "—"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle>Resource Requests</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total</span>
                    <span className="font-bold">{resources?.resourceRequests.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Fulfilled</span>
                    <span className="font-bold text-green-600">{resources?.resourceRequests.fulfilled ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pending</span>
                    <span className="font-bold text-yellow-600">{resources?.resourceRequests.pending ?? 0}</span>
                  </div>
                  <Progress value={resources?.resourceRequests.fulfillmentRate ?? 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {resources?.resourceRequests.fulfillmentRate ?? 0}% fulfillment rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Aid Offers</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Offers</span>
                    <span className="font-bold">{resources?.aidOffers.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Matched</span>
                    <span className="font-bold text-green-600">{resources?.aidOffers.matched ?? 0}</span>
                  </div>
                  <Progress value={resources?.aidOffers.matchRate ?? 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {resources?.aidOffers.matchRate ?? 0}% match rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Items</span>
                    <span className="font-bold">{resources?.inventory.totalItems ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Low Stock</span>
                    <span className="font-bold text-yellow-600">{resources?.inventory.lowStockItems ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Critical (0 qty)</span>
                    <span className="font-bold text-red-600">{resources?.inventory.criticalItems ?? 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* §8 Funnel tab */}
          <TabsContent value="funnel" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Incident Conversion Funnel
                  </CardTitle>
                  <CardDescription>
                    Overall conversion: <strong>{funnelData?.overallConversionRate ?? 0}%</strong> (submitted → resolved)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(funnelData?.funnel ?? []).map((stage: any) => (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-muted-foreground">{stage.count} ({stage.pct}%)</span>
                      </div>
                      <div className="h-6 rounded-md overflow-hidden bg-muted">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${stage.pct}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    SOS Resolution Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(funnelData?.sosFunnel ?? []).map((stage: any) => (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-muted-foreground">{stage.count} ({stage.pct}%)</span>
                      </div>
                      <div className="h-6 rounded-md overflow-hidden bg-muted">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${stage.pct}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Funnel Chart</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* §8 Cohort tab */}
          <TabsContent value="cohort" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold">{cohortData?.engagement?.totalUsers ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{cohortData?.engagement?.activeReporters ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Active Reporters</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{cohortData?.engagement?.engagementRate ?? 0}%</p>
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  <Progress value={cohortData?.engagement?.engagementRate ?? 0} className="mt-2" />
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    User Cohorts by Age
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cohortData?.userCohorts ?? []}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ label, count }) => count > 0 ? `${label}: ${count}` : ""}
                        >
                          {(cohortData?.userCohorts ?? []).map((_entry: any, i: number) => (
                            <Cell key={i} fill={_entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reports by Role</CardTitle>
                  <CardDescription>Average reports per user per role</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(cohortData?.roleBreakdown ?? []).map((rb: any) => (
                    <div key={rb.role} className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{rb.count}</p>
                      <p className="text-xs text-muted-foreground capitalize">{rb.role}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
