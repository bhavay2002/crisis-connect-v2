import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import DisasterReportCard from "@/components/feed/DisasterReportCard";
import { AlertTriangle, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { DisasterReport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function MyReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reportsResponse, isLoading } = useQuery<{ data: DisasterReport[]; pagination: any }>({
    queryKey: ["/api/reports/user", user?.id],
    enabled: !!user?.id,
  });

  const reports = reportsResponse?.data || [];

  const handleVerify = async (reportId: string) => {
    try {
      await apiRequest(`/api/reports/${reportId}/verify`, { method: "POST" });
      toast({
        title: "Report verified",
        description: "Thank you for helping verify this report",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/user", user?.id] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify report",
        variant: "destructive",
      });
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = !searchQuery || 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (!user) {
    return (
        <div className="p-6">
          <div className="rounded-2xl border-2 border-dashed py-16 text-center max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">Please sign in to view your reports</p>
          </div>
        </div>
    );
  }

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <h1 className="text-2xl font-black">My Reports</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                View and manage all your submitted disaster reports
              </p>
            </div>
            <Button onClick={() => setLocation("/submit")} data-testid="button-submit-new-report">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Submit New Report
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search your reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-reports"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Loading your reports...</p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-40" />
            <p className="text-base font-bold mb-1">
              {reports.length === 0 ? "No Reports Yet" : "No Matching Reports"}
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              {reports.length === 0
                ? "You haven't submitted any disaster reports yet."
                : "No reports match your search criteria."}
            </p>
            {reports.length === 0 && (
              <Button onClick={() => setLocation("/submit")} data-testid="button-submit-first-report">
                Submit Your First Report
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <DisasterReportCard
                key={report.id}
                report={{ ...report, timestamp: report.createdAt.toISOString() }}
                onVerify={() => handleVerify(report.id)}
              />
            ))}
          </div>
        )}
      </div>
  );
}
