import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Link as LinkIcon, Play, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DisasterReport } from "@shared/schema";

interface ClusterData {
  clusterId: string;
  primaryReport: DisasterReport;
  relatedReports: DisasterReport[];
  totalReports: number;
  confidence: number;
  reasons: string[];
}

interface ClustersResponse {
  clusters: ClusterData[];
  totalClusters: number;
  totalReportsInClusters: number;
}

export default function ClusterManagementPage() {
  const { toast } = useToast();
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const { data: clustersData, isLoading: loadingClusters } = useQuery<ClustersResponse>({
    queryKey: ["/api/reports/clusters"],
  });

  const runClusteringMutation = useMutation({
    mutationFn: async (limit: number) => {
      return await apiRequest("/api/reports/run-clustering?limit=" + limit, {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Clustering Complete",
        description: `Found ${data.clustersFound} clusters across ${data.reportsAnalyzed} reports`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/clusters"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run clustering analysis",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-500";
      case "responding":
        return "bg-blue-500";
      case "verified":
        return "bg-yellow-500";
      case "reported":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loadingClusters) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-clusters">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black" data-testid="text-page-title">Report Clustering & Duplicate Detection</h1>
        </div>
        <p className="text-sm text-muted-foreground">Automatically detect and group similar disaster reports to identify duplicates and related incidents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Total Clusters", value: clustersData?.totalClusters || 0, testId: "text-total-clusters", bg: "bg-orange-500/10", color: "text-orange-500", icon: LinkIcon },
          { label: "Reports in Clusters", value: clustersData?.totalReportsInClusters || 0, testId: "text-reports-in-clusters", bg: "bg-blue-500/10", color: "text-blue-500", icon: AlertTriangle },
        ].map(({ label, value, testId, bg, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-background p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-3xl font-black" data-testid={testId}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
        <div className="rounded-xl border bg-background p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Actions</p>
          <Button
            onClick={() => runClusteringMutation.mutate(100)}
            disabled={runClusteringMutation.isPending}
            className="w-full"
            data-testid="button-run-clustering"
          >
            {runClusteringMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</>
            ) : (
              <><Play className="mr-2 h-4 w-4" />Run Clustering</>
            )}
          </Button>
        </div>
      </div>

      {clustersData && clustersData.clusters.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No clusters found</AlertTitle>
          <AlertDescription>
            Click "Run Clustering" to analyze recent reports and detect duplicates.
          </AlertDescription>
        </Alert>
      )}

      {clustersData && clustersData.clusters.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Detected Clusters</h2>
          <Accordion type="single" collapsible value={expandedCluster || ""} onValueChange={setExpandedCluster}>
            {clustersData.clusters.map((cluster, index) => (
              <AccordionItem key={cluster.clusterId} value={cluster.clusterId} data-testid={`cluster-item-${cluster.clusterId}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        Cluster {index + 1}
                      </Badge>
                      <div className="text-left">
                        <div className="font-semibold">{cluster.primaryReport.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {cluster.totalReports} related reports • {Math.round(cluster.confidence * 100)}% confidence
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getSeverityColor(cluster.primaryReport.severity)}>
                        {cluster.primaryReport.severity}
                      </Badge>
                      <Badge variant="secondary">{cluster.primaryReport.type}</Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Primary Report
                      </h4>
                      <div className="rounded-xl border bg-background p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h5 className="font-semibold text-sm">{cluster.primaryReport.title}</h5>
                            <p className="text-xs text-muted-foreground mt-1">{cluster.primaryReport.description}</p>
                          </div>
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(cluster.primaryReport.status)}`} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{cluster.primaryReport.location} · {new Date(cluster.primaryReport.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Related Reports ({cluster.relatedReports.length})
                      </h4>
                      <div className="space-y-2">
                        {cluster.relatedReports.map((report) => (
                          <div key={report.id} className="rounded-xl border bg-background p-3 border-l-4 border-l-orange-500" data-testid={`related-report-${report.id}`}>
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h5 className="font-semibold text-sm">{report.title}</h5>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                              </div>
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusColor(report.status)}`} />
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <span className="text-xs px-2 py-0.5 rounded-full border font-medium">{report.type}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full border font-medium capitalize">{report.severity}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{report.location} · {new Date(report.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Clustering Reasons</h4>
                      <div className="flex flex-wrap gap-2">
                        {cluster.reasons.map((reason, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs" data-testid={`reason-badge-${idx}`}>
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
