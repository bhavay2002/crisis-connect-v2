import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import StatsCard from "@/components/feed/StatsCard";
import DisasterReportCard from "@/components/feed/DisasterReportCard";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, CheckCircle, Users, MapPinned, PlusCircle, Radio,
  Brain, Globe, Zap, Activity, ArrowRight, Clock, TrendingUp, Shield,
  Wifi, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { DisasterReport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const QUICK_ACTIONS = [
  { label: "Submit Report",    url: "/submit",        icon: PlusCircle, color: "text-red-500",    bg: "bg-red-500/10",    desc: "Report an incident" },
  { label: "Broadcast Alert",  url: "/broadcast-alerts", icon: Radio,  color: "text-orange-500", bg: "bg-orange-500/10", desc: "Send emergency alert" },
  { label: "AI Copilot",       url: "/copilot",       icon: Brain,      color: "text-purple-500", bg: "bg-purple-500/10", desc: "Get AI guidance"   },
  { label: "Risk Map",         url: "/risk-map",      icon: Globe,      color: "text-teal-500",   bg: "bg-teal-500/10",   desc: "View live map"     },
  { label: "Simulation",       url: "/simulation",    icon: Zap,        color: "text-yellow-500", bg: "bg-yellow-500/10", desc: "Run crisis sim"    },
  { label: "Monitoring",       url: "/monitoring",    icon: Activity,   color: "text-cyan-500",   bg: "bg-cyan-500/10",   desc: "System health"     },
];

const SEV_BAR = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-500" };

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reportsResponse, isLoading } = useQuery<{ data: DisasterReport[]; pagination: any }>({
    queryKey: ["/api/reports"],
  });
  const { data: monitoringStats } = useQuery<any>({ queryKey: ["/api/monitoring/stats"] });

  const reports = reportsResponse?.data || [];

  useRealtimeMessage(useCallback((message: any) => {
    if (message.type === "new_report") {
      toast({ title: "🚨 New Emergency Report", description: message.data?.title || "A new incident has been reported" });
    }
  }, [toast]));

  const handleVerify = async (reportId: string) => {
    try {
      await apiRequest(`/api/reports/${reportId}/verify`, { method: "POST" });
      toast({ title: "Report upvoted" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    } catch (error: any) {
      if (isUnauthorizedError(error)) { setLocation("/login"); return; }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const stats = {
    activeReports:     reports.filter(r => r.status !== "resolved").length,
    criticalCount:     reports.filter(r => r.severity === "critical" && r.status !== "resolved").length,
    verifiedIncidents: reports.filter(r => r.status === "verified" || r.status === "responding").length,
    responseTeams:     reports.filter(r => r.status === "responding").length,
    affectedAreas:     new Set(reports.map(r => r.location)).size,
    resolvedToday:     reports.filter(r => r.status === "resolved").length,
  };

  const criticalReports = reports.filter(r => r.severity === "critical" && r.status !== "resolved");

  const filtered = reports
    .filter(r => r.status !== "resolved")
    .filter(r => !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.location.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 6);

  // Severity breakdown
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  reports.filter(r => r.status !== "resolved").forEach(r => { if (r.severity in sevCounts) sevCounts[r.severity as keyof typeof sevCounts]++; });
  const total = Object.values(sevCounts).reduce((a, b) => a + b, 0) || 1;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* ── Critical Alert Banner ── */}
        {criticalReports.length > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
            <div className="flex items-center justify-between gap-4 pl-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-sm text-red-700 dark:text-red-400">
                    {criticalReports.length} Critical Incident{criticalReports.length > 1 ? "s" : ""} Active
                  </p>
                  <p className="text-xs text-muted-foreground">{criticalReports[0]?.title}</p>
                </div>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs flex-shrink-0" onClick={() => setLocation("/reports")}>
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}, {user?.name?.split(" ")[0] || "Commander"}</p>
            <h1 className="text-2xl font-black">Emergency Command Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
            <Button size="sm" onClick={() => setLocation("/submit")} className="h-8">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />New Report
            </Button>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatsCard title="Active Reports"    value={stats.activeReports}     icon={AlertTriangle} color="red"    description="Unresolved" />
          <StatsCard title="Critical"          value={stats.criticalCount}     icon={AlertTriangle} color="red"    description="Immediate action" />
          <StatsCard title="Verified"          value={stats.verifiedIncidents} icon={CheckCircle}   color="blue"   description="Confirmed incidents" />
          <StatsCard title="Responding"        value={stats.responseTeams}     icon={Users}         color="orange" description="Teams deployed" />
          <StatsCard title="Affected Areas"    value={stats.affectedAreas}     icon={MapPinned}     color="purple" description="Unique locations" />
          <StatsCard title="Resolved"          value={stats.resolvedToday}     icon={CheckCircle}   color="green"  description="Total resolved" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left: Reports + search ── */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-bold text-base">Active Incidents</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs w-48" data-testid="input-search-reports" />
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setLocation("/reports")} data-testid="button-view-all">
                  View All
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed bg-muted/30">
                <CheckCircle className="w-10 h-10 text-green-500 mb-2 opacity-60" />
                <p className="font-semibold text-sm">All clear — no active reports</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map(report => (
                  <DisasterReportCard
                    key={report.id}
                    report={{ id: report.id, title: report.title, type: report.type, severity: report.severity, location: report.location, description: report.description, timestamp: new Date(report.createdAt).toLocaleString(), verificationCount: report.verificationCount, status: report.status }}
                    onVerify={() => handleVerify(report.id)}
                    onViewDetails={() => setLocation(`/reports/${report.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Sidebar panels ── */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="rounded-xl border bg-background p-4">
              <h3 className="font-bold text-sm mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(({ label, url, icon: Icon, color, bg }) => (
                  <Link key={url} href={url}
                    className="group flex flex-col items-center gap-1.5 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-center cursor-pointer">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="rounded-xl border bg-background p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Severity Breakdown
              </h3>
              <div className="space-y-2.5">
                {(["critical","high","medium","low"] as const).map(sev => (
                  <div key={sev}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize font-medium">{sev}</span>
                      <span className="text-muted-foreground">{sevCounts[sev]}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${SEV_BAR[sev]} transition-all`} style={{ width: `${(sevCounts[sev] / total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            {monitoringStats && (
              <div className="rounded-xl border bg-background p-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Platform Health
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Total Reports",    value: monitoringStats.platform?.totalReports },
                    { label: "SOS Alerts",       value: monitoringStats.platform?.totalSOS },
                    { label: "Active Users",     value: monitoringStats.platform?.totalUsers },
                    { label: "Circuit Breakers", value: `${monitoringStats.circuitBreakers?.length || 0} CLOSED` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-bold">{value}</span>
                    </div>
                  ))}
                </div>
                <Link href="/monitoring">
                  <Button variant="ghost" size="sm" className="w-full mt-3 h-7 text-xs text-muted-foreground">
                    Full Monitoring Dashboard <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Platform features callout */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-bold text-purple-700 dark:text-purple-400">Top 1% Features Active</p>
              </div>
              <div className="space-y-1">
                {[
                  { label: "Multimodal AI", url: "/multimodal-ai" },
                  { label: "Simulation Engine", url: "/simulation" },
                  { label: "Digital Twin", url: "/digital-twin" },
                  { label: "AI Override Queue", url: "/ai-override" },
                ].map(({ label, url }) => (
                  <Link key={url} href={url}>
                    <a className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-0.5 cursor-pointer">
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-purple-400" />{label}</span>
                      <ArrowRight className="w-3 h-3 opacity-50" />
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
