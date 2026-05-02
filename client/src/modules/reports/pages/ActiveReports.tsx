import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DisasterReportCard from "@/components/feed/DisasterReportCard";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, AlertTriangle, CheckCircle, SlidersHorizontal } from "lucide-react";
import type { DisasterReport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const SEV_COUNTS_COLORS: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  high:     "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  medium:   "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
  low:      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
};

export default function ActiveReports() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const { data: userVerifications = [] } = useQuery<{ reportId: string }[]>({
    queryKey: ["/api/verifications/mine"],
    enabled: !!currentUser,
  });
  const verifiedReportIds = new Set(userVerifications.map(v => v.reportId));

  const { data: reportsResponse, isLoading } = useQuery<{ data: DisasterReport[]; pagination: any }>({
    queryKey: ["/api/reports"],
  });
  const reports = reportsResponse?.data || [];

  useRealtimeMessage(useCallback((message: any) => {
    if (["new_report","report_updated","report_verified","report_confirmed","report_unconfirmed"].includes(message.type)) {
      queryClient.invalidateQueries({ queryKey: ["/api/verifications/mine"] });
    }
  }, [queryClient]));

  const handleVerify = async (reportId: string) => {
    try {
      await apiRequest(`/api/reports/${reportId}/verify`, { method: "POST" });
      toast({ title: "Report upvoted" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verifications/mine"] });
    } catch (error: any) {
      if (isUnauthorizedError(error)) { setLocation("/login"); return; }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleConfirm = async (reportId: string, isConfirmed: boolean) => {
    try {
      await apiRequest(`/api/reports/${reportId}/confirm`, { method: isConfirmed ? "DELETE" : "POST" });
      toast({ title: isConfirmed ? "Confirmation removed" : "Report confirmed" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    } catch (error: any) {
      if (isUnauthorizedError(error)) { setLocation("/login"); return; }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    const matchSev = severityFilter === "all" || r.severity === severityFilter;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchSev && matchStatus;
  });

  // Summary counts
  const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  reports.filter(r => r.status !== "resolved").forEach(r => { if (r.severity in sevCounts) sevCounts[r.severity as keyof typeof sevCounts]++; });

  return (
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Active Reports</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Monitor and manage all emergency incidents in real time</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
          </div>
        </div>

        {/* Severity pills */}
        <div className="flex flex-wrap gap-2">
          {(["critical","high","medium","low"] as const).map(sev => (
            <button key={sev} onClick={() => setSeverityFilter(severityFilter === sev ? "all" : sev)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all capitalize
                ${severityFilter === sev ? SEV_COUNTS_COLORS[sev] + " ring-1 ring-inset ring-current" : "bg-background border-border hover:border-muted-foreground text-muted-foreground"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sev === "critical" ? "bg-red-500" : sev === "high" ? "bg-orange-500" : sev === "medium" ? "bg-yellow-500" : "bg-blue-500"}`} />
              {sev}
              <span className="font-black">{sevCounts[sev]}</span>
            </button>
          ))}
          {severityFilter !== "all" && (
            <button onClick={() => setSeverityFilter("all")} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">
              Clear ×
            </button>
          )}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by location, title, or description…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" data-testid="input-search" />
          </div>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36 h-9" data-testid="select-severity-filter">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredReports.length}</span> of <span className="font-semibold text-foreground">{reports.length}</span> reports
          </p>
          {(searchQuery || severityFilter !== "all" || statusFilter !== "all") && (
            <button onClick={() => { setSearchQuery(""); setSeverityFilter("all"); setStatusFilter("all"); }}
              className="text-xs text-muted-foreground hover:text-foreground">
              Clear all filters ×
            </button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed bg-muted/30">
            <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-50" />
            <p className="font-bold text-base">No reports match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredReports.map(report => {
              const canConfirm = currentUser && ["volunteer","ngo","admin","authority","super_admin"].includes(currentUser.role);
              const isConfirmed = !!report.confirmedBy;
              const hasVerified = verifiedReportIds.has(report.id);
              return (
                <DisasterReportCard
                  key={report.id}
                  report={{ id: report.id, title: report.title, type: report.type, severity: report.severity, location: report.location, description: report.description, timestamp: new Date(report.createdAt).toLocaleString(), verificationCount: report.verificationCount, status: report.status, confirmedBy: report.confirmedBy, confirmedAt: report.confirmedAt }}
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
        )}
      </div>
  );
}
