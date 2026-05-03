/**
 * ReportDetails — full incident view with embedded AI Explainability Panel.
 *
 * The AIExplainabilityPanel renders below the report card — collapsed by default.
 * Clicking "AI Analysis" expands it to show the full decision intelligence view.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast }  from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { DisasterReport } from "@shared/schema";
import {
  MapPin, Clock, ThumbsUp, ShieldCheck, AlertTriangle,
  Flame, Droplets, ArrowLeft, Image as ImageIcon,
} from "lucide-react";
import { FakeDetectionBadge } from "@/components/FakeDetectionBadge";
import { AIExplainabilityPanel } from "@/components/ai";
import { formatDistanceToNow, format } from "date-fns";

const typeIcons: Record<string, any> = {
  fire: Flame, flood: Droplets, earthquake: AlertTriangle, storm: AlertTriangle,
  road_accident: AlertTriangle, epidemic: AlertTriangle, landslide: AlertTriangle,
  gas_leak: AlertTriangle, building_collapse: AlertTriangle, chemical_spill: AlertTriangle,
  power_outage: AlertTriangle, water_contamination: Droplets, other: AlertTriangle,
};

const severityColors: Record<string, string> = {
  low:      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  medium:   "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  high:     "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const statusColors: Record<string, string> = {
  reported:  "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  verified:  "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  responding:"bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved:  "bg-green-500/10 text-green-700 dark:text-green-400",
};

const severityBorderColors: Record<string, string> = {
  critical: "border-l-red-500", high: "border-l-orange-500",
  medium: "border-l-yellow-500", low: "border-l-blue-500",
};

export default function ReportDetails() {
  const [, navigate]  = useLocation();
  const [, params]    = useRoute("/reports/:id");
  const { toast }     = useToast();
  const queryClient   = useQueryClient();
  const reportId      = params?.id;

  const { data: report, isLoading } = useQuery<DisasterReport>({
    queryKey: [`/api/reports/${reportId}`],
    enabled: !!reportId,
  });

  const { data: currentUser }   = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const { data: userVerifications = [] } = useQuery<{ reportId: string }[]>({
    queryKey: ["/api/verifications/mine"],
    enabled: !!currentUser,
  });

  const hasVerified = userVerifications.some(v => v.reportId === reportId);

  const verifyMutation = useMutation({
    mutationFn: () => apiRequest(`/api/reports/${reportId}/verify`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verifications/mine"] });
      toast({ title: "Report upvoted", description: "Thank you for helping verify this report" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) { setTimeout(() => navigate("/login"), 500); return; }
      toast({ title: "Error", description: error.message || "Failed to upvote report", variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const isConfirmed = !!report?.confirmedBy;
      return apiRequest(`/api/reports/${reportId}/confirm`, { method: isConfirmed ? "DELETE" : "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reports/${reportId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      const wasConfirmed = !!report?.confirmedBy;
      toast({ title: wasConfirmed ? "Confirmation removed" : "Report confirmed" });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) { setTimeout(() => navigate("/login"), 500); return; }
      toast({ title: "Error", description: error.message || "Failed to confirm report", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading report…</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3 mx-auto opacity-40" />
          <p className="font-bold mb-1">Report not found</p>
          <p className="text-sm text-muted-foreground mb-4">This report may have been deleted or you don't have permission to view it</p>
          <Button onClick={() => navigate("/reports")} data-testid="button-back-to-reports">Back to Reports</Button>
        </div>
      </div>
    );
  }

  const TypeIcon   = typeIcons[report.type] ?? AlertTriangle;
  const isConfirmed = !!report.confirmedBy;
  const canConfirm  = currentUser && ["volunteer","ngo","admin","authority","super_admin"].includes(currentUser.role);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" onClick={() => navigate("/reports")} className="h-8 text-xs" data-testid="button-back">
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Reports
      </Button>

      {/* ── Main report card ── */}
      <div className={`rounded-2xl border-l-4 bg-background shadow-sm overflow-hidden ${severityBorderColors[report.severity] ?? "border-l-slate-500"}`}>
        <div className="p-6">
          {/* Title + badges */}
          <div className="flex items-start gap-4 mb-5">
            <div className={`p-3 rounded-xl ${severityColors[report.severity]} flex-shrink-0`}>
              <TypeIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black mb-2" data-testid="text-report-title">{report.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${statusColors[report.status]}`} data-testid="badge-status">
                  {report.status}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full border font-semibold uppercase">{report.severity}</span>
                {isConfirmed && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-semibold dark:bg-green-950 dark:text-green-300" data-testid="badge-confirmed">
                    <ShieldCheck className="w-3 h-3" />CONFIRMED
                  </span>
                )}
                <FakeDetectionBadge score={report.fakeDetectionScore} flags={report.fakeDetectionFlags} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <h3 className="font-bold text-sm mb-2">Description</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-description">{report.description}</p>
          </div>

          <Separator className="mb-5" />

          {/* Meta grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="space-y-3">
              {[
                {
                  icon: MapPin,
                  label: "Location",
                  content: <span className="font-semibold text-sm" data-testid="text-location">{report.location}</span>,
                },
                {
                  icon: Clock,
                  label: "Reported",
                  content: <>
                    <span className="font-semibold text-sm" data-testid="text-created-at">
                      {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </span>
                    <p className="text-xs text-muted-foreground">{format(new Date(report.createdAt), "PPpp")}</p>
                  </>,
                },
                {
                  icon: ThumbsUp,
                  label: "Upvotes",
                  content: <span className="font-semibold text-sm" data-testid="text-verification-count">{report.verificationCount} upvotes</span>,
                },
              ].map(({ icon: Icon, label, content }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {content}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {report.mediaUrls && report.mediaUrls.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Media</p>
                    <div className="flex flex-col gap-1">
                      {report.mediaUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm" data-testid={`link-media-${i}`}>
                          View media {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Confirmed banner */}
          {isConfirmed && report.confirmedAt && (
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="font-bold text-sm text-green-900 dark:text-green-100">Officially Confirmed</h3>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Confirmed {formatDistanceToNow(new Date(report.confirmedAt), { addSuffix: true })}
              </p>
            </div>
          )}

          <Separator className="mb-5" />

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant={hasVerified ? "default" : "outline"}
              onClick={() => verifyMutation.mutate()}
              disabled={hasVerified || verifyMutation.isPending}
              data-testid="button-upvote">
              <ThumbsUp className="w-4 h-4 mr-2" />
              {hasVerified ? "Upvoted" : verifyMutation.isPending ? "Upvoting…" : "Upvote"}
            </Button>
            {canConfirm && (
              <Button variant={isConfirmed ? "default" : "outline"}
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className={isConfirmed ? "bg-green-600 hover:bg-green-700" : ""}
                data-testid="button-confirm">
                <ShieldCheck className="w-4 h-4 mr-2" />
                {confirmMutation.isPending ? "Processing…" : isConfirmed ? "Confirmed" : "Confirm"}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/map")} data-testid="button-view-on-map">
              <MapPin className="w-4 h-4 mr-2" />View on Map
            </Button>
          </div>
        </div>
      </div>

      {/* ── AI Explainability Panel ────────────────────────────────────────────── */}
      {/* Collapsed by default — expands on click to show full decision intelligence */}
      <AIExplainabilityPanel
        reportId={report.id}
        createdAt={report.createdAt.toString()}
      />
    </div>
  );
}
