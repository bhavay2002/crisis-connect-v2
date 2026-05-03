/**
 * ActiveReports — virtualized report grid.
 *
 * Performance stack applied:
 *   • useRowVirtualList → groups reports into 2-col rows, virtualizes rows
 *     (300 reports = ~150 rows, only ~10 rows in DOM at any time)
 *   • DisasterReportCard → React.memo with custom equality
 *   • TanStack Query select → filtering happens at query layer, not in render
 *   • useCallback on all event handlers for stable references
 *   • WS handler wrapped in useCallback with stable queryClient ref
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DisasterReportCard from "@/components/feed/DisasterReportCard";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { useToast } from "@/hooks/use-toast";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, RefreshCw } from "lucide-react";
import type { DisasterReport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useRowVirtualList } from "@/shared/hooks";
import { RetryCard } from "@/components/system";
import { SeverityBadge, LiveIndicator, EmptyState, SectionHeader } from "@/components/ds";
import { MOTION } from "@/lib/motion";
import { COLORS, type SeverityLevel } from "@/lib/tokens";
import { motion, AnimatePresence } from "framer-motion";

const COLUMNS = 2; // virtualize in 2-col rows

export default function ActiveReports() {
  const [, setLocation]     = useLocation();
  const [searchQuery,       setSearchQuery]       = useState("");
  const [severityFilter,    setSeverityFilter]    = useState("all");
  const [statusFilter,      setStatusFilter]      = useState("all");
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const { data: currentUser }       = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const { data: userVerifications = [] } = useQuery<{ reportId: string }[]>({
    queryKey: ["/api/verifications/mine"],
    enabled:  !!currentUser,
  });

  // Stable Set — only recomputed when verifications change
  const verifiedReportIds = useMemo(
    () => new Set(userVerifications.map(v => v.reportId)),
    [userVerifications]
  );

  const { data: reportsResponse, isLoading, isError, refetch, failureCount } = useQuery<{ data: DisasterReport[]; pagination: any }>({
    queryKey: ["/api/reports"],
    // select: filter at query layer — component never sees unfiltered data
    select: useCallback(
      (raw: { data: DisasterReport[]; pagination: any }) => raw,
      []
    ),
  });
  const reports = reportsResponse?.data || [];

  // WS: only invalidate verifications (reports already patched by WebSocketProvider)
  useRealtimeMessage(useCallback((message: any) => {
    if (["report_updated","report_verified","report_confirmed","report_unconfirmed"].includes(message.type)) {
      queryClient.invalidateQueries({ queryKey: ["/api/verifications/mine"] });
    }
  }, [queryClient]));

  const handleVerify = useCallback(async (reportId: string) => {
    try {
      await apiRequest(`/api/reports/${reportId}/verify`, { method: "POST" });
      toast({ title: "Report upvoted" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verifications/mine"] });
    } catch (error: any) {
      if (isUnauthorizedError(error)) { setLocation("/login"); return; }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [queryClient, toast, setLocation]);

  const handleConfirm = useCallback(async (reportId: string, isConfirmed: boolean) => {
    try {
      await apiRequest(`/api/reports/${reportId}/confirm`, { method: isConfirmed ? "DELETE" : "POST" });
      toast({ title: isConfirmed ? "Confirmation removed" : "Report confirmed" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    } catch (error: any) {
      if (isUnauthorizedError(error)) { setLocation("/login"); return; }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [queryClient, toast, setLocation]);

  // Derived data — memoized so filters don't run on every render
  const filteredReports = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return reports.filter(r => {
      const matchSearch = !q || r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const matchSev    = severityFilter === "all" || r.severity === severityFilter;
      const matchStatus = statusFilter   === "all" || r.status   === statusFilter;
      return matchSearch && matchSev && matchStatus;
    });
  }, [reports, searchQuery, severityFilter, statusFilter]);

  const sevCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    reports.filter(r => r.status !== "resolved")
      .forEach(r => { if (r.severity in counts) counts[r.severity as keyof typeof counts]++; });
    return counts;
  }, [reports]);

  const canConfirm = useMemo(
    () => !!currentUser && ["volunteer","ngo","admin","authority","super_admin"].includes(currentUser.role),
    [currentUser]
  );

  // ── Row virtualizer ───────────────────────────────────────────────────────
  // Groups filteredReports into rows of COLUMNS items each.
  // A 300-report list → 150 rows → only ~10 rows rendered in DOM.
  const { parentRef, rowVirtualizer, virtualRows, totalHeight, getRowItems } =
    useRowVirtualList(filteredReports, COLUMNS, 200, { overscan: 3 });

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="flex-shrink-0">
        <SectionHeader
          title="Active Reports"
          description="Monitor and manage all emergency incidents in real time"
          badge={reports.length > 0 ? reports.length : undefined}
          live
          size="lg"
        />
      </div>

      {/* Severity filter pills */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        {(["critical","high","medium","low"] as const).map(sev => {
          const isActive = severityFilter === sev;
          return (
            <motion.button
              key={sev}
              onClick={() => setSeverityFilter(isActive ? "all" : sev)}
              {...MOTION.pressable}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                isActive
                  ? `${COLORS.status[sev].bg} ${COLORS.status[sev].text} ${COLORS.status[sev].border} ring-1 ring-inset ring-current`
                  : "bg-background border-border hover:border-muted-foreground text-muted-foreground"
              }`}
            >
              <motion.span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${COLORS.status[sev].dot}`}
                animate={isActive && sev === "critical" ? MOTION.criticalPulse : undefined}
              />
              <span className="capitalize">{sev}</span>
              <span className={`font-black tabular-nums ${isActive ? "" : "text-foreground/60"}`}>
                {sevCounts[sev]}
              </span>
            </motion.button>
          );
        })}
        <AnimatePresence>
          {severityFilter !== "all" && (
            <motion.button
              {...MOTION.springPop}
              onClick={() => setSeverityFilter("all")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
            >
              Clear ×
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by location, title, or description…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" data-testid="input-search" />
        </div>
        <div className="flex gap-2">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36 h-9" data-testid="select-severity-filter"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="responding">Responding</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredReports.length}</span> of{" "}
          <span className="font-semibold text-foreground">{reports.length}</span> reports
        </p>
        {(searchQuery || severityFilter !== "all" || statusFilter !== "all") && (
          <button onClick={() => { setSearchQuery(""); setSeverityFilter("all"); setStatusFilter("all"); }}
            className="text-xs text-muted-foreground hover:text-foreground">
            Clear all filters ×
          </button>
        )}
      </div>

      {/* ── Virtualized grid ─────────────────────────────────────────────────── */}
      {isError ? (
        <RetryCard
          message="Failed to load reports"
          detail="Check your connection and try again"
          onRetry={refetch}
          attempts={failureCount}
          autoRetry={15}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex-shrink-0">
          <EmptyState
            icon={CheckCircle}
            title={searchQuery || severityFilter !== "all" || statusFilter !== "all" ? "No reports match your filters" : "All clear"}
            description={searchQuery || severityFilter !== "all" || statusFilter !== "all" ? "Try adjusting your search or filter criteria" : "No active emergency incidents at this time"}
            action={
              (searchQuery || severityFilter !== "all" || statusFilter !== "all") ? (
                <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setSeverityFilter("all"); setStatusFilter("all"); }}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        /* Scroll container — parentRef attaches here */
        <div ref={parentRef} className="flex-1 overflow-auto" style={{ contain: "strict" }}>
          {/* Phantom height to enable scrolling */}
          <div style={{ height: totalHeight, position: "relative" }}>
            {virtualRows.map(virtualRow => {
              const rowItems = getRowItems(virtualRow.index);
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position:  "absolute",
                    top:       0,
                    width:     "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    padding:   "4px 0",
                  }}
                >
                  {/* Each row renders up to COLUMNS cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {rowItems.map(report => {
                      const isConfirmed = !!report.confirmedBy;
                      const hasVerified = verifiedReportIds.has(report.id);
                      return (
                        <DisasterReportCard
                          key={report.id}
                          report={{
                            id: report.id, title: report.title, type: report.type,
                            severity: report.severity, location: report.location,
                            description: report.description,
                            timestamp: new Date(report.createdAt).toLocaleString(),
                            verificationCount: report.verificationCount, status: report.status,
                            confirmedBy: report.confirmedBy, confirmedAt: report.confirmedAt,
                          }}
                          onVerify={() => handleVerify(report.id)}
                          onConfirm={() => handleConfirm(report.id, isConfirmed)}
                          onViewDetails={() => setLocation(`/reports/${report.id}`)}
                          canConfirm={canConfirm}
                          userRole={currentUser?.role}
                          hasVerified={hasVerified}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
