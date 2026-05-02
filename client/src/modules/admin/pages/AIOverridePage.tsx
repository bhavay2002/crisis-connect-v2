import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle, UserCheck, Brain, BarChart3, Clock, Shield, X } from "lucide-react";

interface OverrideRecord {
  id: string; incidentId: string; incidentType: string;
  originalDecision: any; overriddenDecision?: any;
  aiConfidence: string; aiUrgency?: string;
  requiresHumanReview: boolean; status: string;
  overriddenBy?: string; reason?: string; notes?: string;
  createdAt: string; reviewedAt?: string;
}
interface OverrideStats {
  total: number; pending: number; approved: number; overridden: number; autoApproved: number; overrideRate: number;
}

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  pending_review: { cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300", label: "Pending Review" },
  approved:       { cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300", label: "Approved" },
  overridden:     { cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",           label: "Overridden" },
  auto_approved:  { cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",      label: "Auto-approved" },
};
const SEV_CFG: Record<string, string> = {
  low: "bg-blue-50 text-blue-700", medium: "bg-yellow-50 text-yellow-700",
  high: "bg-orange-50 text-orange-700", critical: "bg-red-50 text-red-700",
};
const SEVERITY_OPTS = ["low", "medium", "high", "critical"];
const CRISIS_TYPES = ["fire","flood","earthquake","storm","road_accident","epidemic","landslide","gas_leak","building_collapse","chemical_spill","power_outage","other"];

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function AIOverridePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [overrideAction, setOverrideAction] = useState<"approve" | "override">("approve");
  const [newSeverity, setNewSeverity] = useState("high");
  const [newType, setNewType] = useState("other");
  const [reason, setReason] = useState("");

  const { data: stats } = useQuery<OverrideStats>({ queryKey: ["/api/ai-overrides/stats/summary"], refetchInterval: 15000 });
  const { data: pendingData } = useQuery<{ overrides: OverrideRecord[] }>({ queryKey: ["/api/ai-overrides?status=pending_review"], refetchInterval: 10000 });
  const { data: allData } = useQuery<{ overrides: OverrideRecord[] }>({ queryKey: ["/api/ai-overrides"] });
  const selectedRecord = allData?.overrides?.find(r => r.id === reviewId);

  const reviewMutation = useMutation({
    mutationFn: () => apiRequest(`/api/ai-overrides/${reviewId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ action: overrideAction, overriddenDecision: overrideAction === "override" ? { crisisType: newType, severity: newSeverity } : undefined, reason }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-overrides"] });
      qc.invalidateQueries({ queryKey: ["/api/ai-overrides/stats/summary"] });
      setReviewId(null); setReason("");
      toast({ title: `Decision ${overrideAction === "approve" ? "approved" : "overridden"}` });
    },
    onError: () => toast({ title: "Review failed", variant: "destructive" }),
  });

  const pending = pendingData?.overrides || [];
  const all = allData?.overrides || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-2xl font-black">AI Decision Override</h1>
            </div>
            <p className="text-sm text-muted-foreground">Human-in-the-loop governance — review, approve, or override AI classifications</p>
          </div>
          <Badge variant="outline" className="border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950">§17.4</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Decisions", value: stats?.total ?? 0,       icon: Brain,       color: "text-blue-600",   bg: "bg-blue-500/10"    },
            { label: "Pending Review",  value: stats?.pending ?? 0,     icon: Clock,       color: stats?.pending ? "text-amber-600" : "text-green-600", bg: stats?.pending ? "bg-amber-500/10" : "bg-green-500/10" },
            { label: "Approved",        value: stats?.approved ?? 0,    icon: CheckCircle, color: "text-green-600",  bg: "bg-green-500/10"   },
            { label: "Overridden",      value: stats?.overridden ?? 0,  icon: AlertTriangle,color:"text-red-600",    bg: "bg-red-500/10"     },
            { label: "Override Rate",   value: `${stats?.overrideRate ?? 0}%`, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Pending alert */}
        {pending.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {pending.length} AI decision{pending.length > 1 ? "s" : ""} pending human review — confidence below threshold or critical severity
            </p>
          </div>
        )}

        <Tabs defaultValue="pending">
          <TabsList className="h-9">
            <TabsTrigger value="pending" className="text-xs">Pending Review ({pending.length})</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Decisions ({all.length})</TabsTrigger>
          </TabsList>

          {[{ key: "pending", rows: pending }, { key: "all", rows: all }].map(({ key, rows }) => (
            <TabsContent key={key} value={key} className="space-y-3 mt-4">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-2 opacity-50" />
                  <p className="font-semibold">{key === "pending" ? "No decisions pending review" : "No AI decisions recorded yet"}</p>
                </div>
              ) : rows.map(row => {
                const sc = STATUS_CFG[row.status] || STATUS_CFG.auto_approved;
                return (
                  <div key={row.id} className={`rounded-2xl border bg-background p-5 ${row.requiresHumanReview && row.status === "pending_review" ? "border-amber-300 dark:border-amber-700" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Status + flags */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}>{sc.label}</span>
                          {row.requiresHumanReview && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950">
                              Flagged for review
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SEV_CFG[row.originalDecision?.severity || "medium"]}`}>
                            {row.originalDecision?.severity || "unknown"}
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Crisis Type</p>
                            <p className="font-semibold text-sm capitalize">{(row.originalDecision?.crisisType || "unknown").replace(/_/g, " ")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                            <ConfidenceBar value={parseFloat(row.aiConfidence) || 0} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Urgency</p>
                            <p className="font-semibold text-sm">{row.aiUrgency ? `${(parseFloat(row.aiUrgency) * 100).toFixed(0)}%` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Incident ID</p>
                            <p className="font-mono text-xs text-muted-foreground truncate">{row.incidentId.slice(0, 16)}…</p>
                          </div>
                        </div>

                        {/* Override result */}
                        {row.overriddenDecision && row.status === "overridden" && (
                          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1">Override applied:</p>
                            <p className="text-xs text-red-600 dark:text-red-400 capitalize">{row.overriddenDecision.crisisType} — {row.overriddenDecision.severity}</p>
                            {row.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {row.reason}</p>}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{new Date(row.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {row.status === "pending_review" && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0" onClick={() => { setReviewId(row.id); setNewSeverity(row.originalDecision?.severity || "high"); setNewType(row.originalDecision?.crisisType || "other"); }}>
                          <UserCheck className="w-4 h-4 mr-1" />Review
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>

        {/* Review dialog */}
        <Dialog open={!!reviewId} onOpenChange={v => !v && setReviewId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                Review AI Decision
              </DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                {/* AI decision summary */}
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">AI Original Decision</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Crisis Type</p><p className="font-semibold capitalize">{(selectedRecord.originalDecision?.crisisType || "—").replace(/_/g, " ")}</p></div>
                    <div><p className="text-xs text-muted-foreground">Severity</p><p className="font-semibold capitalize">{selectedRecord.originalDecision?.severity || "—"}</p></div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                      <ConfidenceBar value={parseFloat(selectedRecord.aiConfidence) || 0} />
                    </div>
                    <div><p className="text-xs text-muted-foreground">Urgency</p><p className="font-semibold">{selectedRecord.aiUrgency ? `${(parseFloat(selectedRecord.aiUrgency) * 100).toFixed(0)}%` : "—"}</p></div>
                  </div>
                </div>

                {/* Action selector */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Your Decision</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setOverrideAction("approve")}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center ${overrideAction === "approve" ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 ring-1 ring-green-500" : "border-border hover:border-green-300"}`}>
                      <CheckCircle className="w-5 h-5 mb-1 mx-auto text-green-600" />
                      Approve AI
                    </button>
                    <button onClick={() => setOverrideAction("override")}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all text-center ${overrideAction === "override" ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 ring-1 ring-red-500" : "border-border hover:border-red-300"}`}>
                      <X className="w-5 h-5 mb-1 mx-auto text-red-600" />
                      Override
                    </button>
                  </div>
                </div>

                {overrideAction === "override" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">New Severity</Label>
                      <Select value={newSeverity} onValueChange={setNewSeverity}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SEVERITY_OPTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">New Type</Label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Reason / Notes</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Explain your decision for the audit trail…" />
                </div>

                <Button className="w-full h-11" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}
                  style={{ background: overrideAction === "approve" ? "#16a34a" : "#dc2626" }}>
                  {reviewMutation.isPending ? "Submitting…" : overrideAction === "approve" ? "✓ Approve AI Decision" : "⚠ Submit Override"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
