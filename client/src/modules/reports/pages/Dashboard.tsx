/**
 * Dashboard — composition-only page.
 * All business logic lives in feature hooks; this page only wires them together.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// ── Feature imports ────────────────────────────────────────────────────────────
import {
  useCrisisRealtime,
  useCrisisActions,
  useCrisisStats,
  useSeverityBreakdown,
  selectNewReportIds,
  useDecisionStore,
} from "@/features/crisis";
import { useMonitoringStats } from "@/features/analytics";

// ── Shared UI ─────────────────────────────────────────────────────────────────
import StatsCard from "@/components/feed/StatsCard";
import DisasterReportCard from "@/components/feed/DisasterReportCard";
import { IncidentTimeline } from "@/components/crisis/IncidentTimeline";
import { LiveCounter }      from "@/components/crisis/LiveCounter";
import { CriticalBadge }   from "@/components/crisis/CriticalBadge";
import { useToast }         from "@/hooks/use-toast";
import { useAuth }          from "@/hooks/useAuth";

import {
  AlertTriangle, CheckCircle, Users, MapPinned, PlusCircle, Radio,
  Brain, Globe, Zap, Activity, ArrowRight, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Search } from "lucide-react";
import type { DisasterReport } from "@shared/schema";

const QUICK_ACTIONS = [
  { label: "Submit Report",    url: "/submit",           icon: PlusCircle, color: "text-red-500",    bg: "bg-red-500/10"    },
  { label: "Broadcast Alert",  url: "/broadcast-alerts", icon: Radio,      color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "AI Copilot",       url: "/copilot",          icon: Brain,      color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Risk Map",         url: "/risk-map",         icon: Globe,      color: "text-teal-500",   bg: "bg-teal-500/10"   },
  { label: "Simulation",       url: "/simulation",       icon: Zap,        color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { label: "Monitoring",       url: "/monitoring",       icon: Activity,   color: "text-cyan-500",   bg: "bg-cyan-500/10"   },
];

const SEV_BAR: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-500",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user }  = useAuth();

  // ── Feature hooks (business logic, not inline) ────────────────────────────
  const newReportIds = useDecisionStore(selectNewReportIds);
  const { upvote }   = useCrisisActions();

  const { data: reportsResponse, isLoading } = useQuery<{ data: DisasterReport[]; pagination: any }>({
    queryKey: ["/api/reports"],
  });
  const { data: monitoringStats } = useMonitoringStats();

  const reports = reportsResponse?.data || [];
  const stats   = useCrisisStats(reports as any);
  const { counts: sevCounts, total } = useSeverityBreakdown(reports as any);

  // Subscribe to WS — shows toast on new report
  useCrisisRealtime({
    onNewReport: (data) => toast({
      title: "🚨 New Emergency Report",
      description: data?.title || "A new incident has been reported",
    }),
  });

  const criticalReports = reports.filter(r => r.severity === "critical" && r.status !== "resolved");
  const filtered = reports
    .filter(r => r.status !== "resolved")
    .filter(r => !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 6);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

      {/* ── Critical Alert Banner ── */}
      <AnimatePresence>
        {criticalReports.length > 0 && (
          <motion.div
            key="critical-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-xl border border-red-500/30 bg-red-500/5 p-4"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
            <div className="flex items-center justify-between gap-4 pl-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.1 }}>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </motion.div>
                </div>
                <div>
                  <p className="font-bold text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <LiveCounter value={criticalReports.length} className="tabular-nums" />
                    {" "}Critical Incident{criticalReports.length > 1 ? "s" : ""} Active
                  </p>
                  <p className="text-xs text-muted-foreground">{criticalReports[0]?.title}</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs flex-shrink-0"
                onClick={() => setLocation("/reports")}
              >
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {[
          { title: "Active Reports",  value: stats.activeReports,     icon: AlertTriangle, color: "red"    as const, description: "Unresolved"         },
          { title: "Critical",        value: stats.criticalCount,     icon: AlertTriangle, color: "red"    as const, description: "Immediate action"    },
          { title: "Verified",        value: stats.verifiedIncidents, icon: CheckCircle,   color: "blue"   as const, description: "Confirmed incidents" },
          { title: "Responding",      value: stats.responseTeams,     icon: Users,         color: "orange" as const, description: "Teams deployed"      },
          { title: "Affected Areas",  value: stats.affectedAreas,     icon: MapPinned,     color: "purple" as const, description: "Unique locations"    },
          { title: "Resolved",        value: stats.resolvedToday,     icon: CheckCircle,   color: "green"  as const, description: "Total resolved"      },
        ].map(card => <StatsCard key={card.title} {...card} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Active incidents ── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-bold text-base">Active Incidents</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs w-48"
                  data-testid="input-search-reports"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => setLocation("/reports")} data-testid="button-view-all">
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
              <AnimatePresence initial={false}>
                {filtered.map(report => {
                  const isNew = newReportIds.has(report.id);
                  return (
                    <motion.div
                      key={report.id}
                      initial={isNew ? { scale: 0.96, opacity: 0, y: 8 } : false}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      className={isNew ? "ring-2 ring-red-500/60 rounded-xl" : undefined}
                    >
                      {isNew && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 rounded-t-xl border border-b-0 border-red-500/30"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Just arrived</span>
                          {report.severity === "critical" && (
                            <CriticalBadge severity="critical" pulse className="ml-auto" />
                          )}
                        </motion.div>
                      )}
                      <DisasterReportCard
                        report={{
                          id: report.id, title: report.title, type: report.type,
                          severity: report.severity, location: report.location,
                          description: report.description,
                          timestamp: new Date(report.createdAt).toLocaleString(),
                          verificationCount: report.verificationCount, status: report.status,
                        }}
                        onVerify={() => upvote(report.id)}
                        onViewDetails={() => setLocation(`/reports/${report.id}`)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
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
                    <span className="capitalize font-medium flex items-center gap-1.5">
                      {sev === "critical" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                      {sev}
                    </span>
                    <LiveCounter value={sevCounts[sev]} className="tabular-nums text-muted-foreground" />
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${SEV_BAR[sev]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(sevCounts[sev] / total) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Event Timeline */}
          <IncidentTimeline />

          {/* Platform Health */}
          {monitoringStats && (
            <div className="rounded-xl border bg-background p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Platform Health
              </h3>
              <div className="space-y-2">
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
                  Full Dashboard <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Top 1% features */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <p className="text-xs font-bold text-purple-700 dark:text-purple-400">Top 1% Features Active</p>
            </div>
            <div className="space-y-1">
              {[
                { label: "Multimodal AI",     url: "/multimodal-ai" },
                { label: "Simulation Engine", url: "/simulation" },
                { label: "Digital Twin",      url: "/digital-twin" },
                { label: "AI Override Queue", url: "/ai-override" },
              ].map(({ label, url }) => (
                <Link key={url} href={url}
                  className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-0.5 cursor-pointer transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-purple-400" />{label}
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-50" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
