import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle, UserCheck, BarChart3, Clock } from "lucide-react";

interface OverrideRecord {
  id: string; incidentId: string; incidentType: string;
  originalDecision: any; overriddenDecision?: any;
  aiConfidence: string; aiUrgency?: string;
  requiresHumanReview: boolean; status: string;
  overriddenBy?: string; reason?: string; notes?: string;
  createdAt: string; reviewedAt?: string;
}
interface OverrideStats { total: number; pending: number; approved: number; overridden: number; autoApproved: number; overrideRate: number }

const STATUS_CFG: Record<string, string> = {
  pending_review: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  approved:       "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  overridden:     "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  auto_approved:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
};
const SEV_CFG: Record<string, string> = {
  low:      "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  medium:   "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  high:     "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};
const SEVERITY_OPTS = ["low", "medium", "high", "critical"];
const CRISIS_TYPES = ["fire","flood","earthquake","storm","road_accident","epidemic","landslide","gas_leak","building_collapse","chemical_spill","power_outage","other"];

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
      toast({ title: `Decision ${overrideAction === "approve" ? "approved" : "overridden"} with audit trail` });
    },
    onError: () => toast({ title: "Review failed", variant: "destructive" }),
  });

  const pending = pendingData?.overrides || [];
  const all = allData?.overrides || [];

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black">AI Decision Override</h1>
          </div>
          <p className="text-sm text-muted-foreground">Human-in-the-loop governance — review AI classifications with full audit trail</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Decisions", value: stats?.total ?? 0,                 color: "text-blue-600",   bg: "bg-blue-500/10",   icon: BarChart3   },
            { label: "Pending Review",  value: stats?.pending ?? 0,               color: stats?.pending ? "text-orange-600" : "text-green-600", bg: stats?.pending ? "bg-orange-500/10" : "bg-green-500/10", icon: Clock },
            { label: "Approved",        value: stats?.approved ?? 0,              color: "text-green-600",  bg: "bg-green-500/10",  icon: CheckCircle },
            { label: "Overridden",      value: stats?.overridden ?? 0,            color: "text-red-600",    bg: "bg-red-500/10",    icon: AlertTriangle},
            { label: "Override Rate",   value: `${stats?.overrideRate ?? 0}%`,    color: "text-purple-600", bg: "bg-purple-500/10", icon: BarChart3   },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-background p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Pending alert banner */}
        {pending.length > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
            <div className="flex items-center gap-3 pl-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                {pending.length} AI decision{pending.length > 1 ? "s" : ""} flagged for human review — confidence below threshold or critical severity
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="pending">
          <TabsList className="h-9">
            <TabsTrigger value="pending" className="text-xs">
              Pending Review
              {pending.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">{pending.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All Decisions ({all.length})</TabsTrigger>
          </TabsList>

          {[{ key: "pending", rows: pending }, { key: "all", rows: all }].map(({ key, rows }) => (
            <TabsContent key={key} value={key} className="space-y-3 mt-4">
              {rows.length === 0 ? (
                <div className="rounded-2xl border bg-background p-12 text-center">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-50" />
                  <p className="font-semibold">{key === "pending" ? "No decisions pending review" : "No AI decisions recorded yet"}</p>
                </div>
              ) : rows.map(row => (
                <div key={row.id} className={`rounded-2xl border bg-background p-4 shadow-sm ${row.requiresHumanReview && row.status === "pending_review" ? "border-orange-300 dark:border-orange-700" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_CFG[row.status]}`}>{row.status.replace(/_/g, " ")}</span>
                        {row.requiresHumanReview && <span className="text-xs px-2 py-0.5 rounded-full border border-orange-400 text-orange-600 dark:text-orange-400">⚠ Flagged</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEV_CFG[row.originalDecision?.severity || "medium"]}`}>
                          {row.originalDecision?.severity || "unknown"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><p className="text-xs text-muted-foreground">Crisis Type</p><p className="text-sm font-semibold capitalize">{(row.originalDecision?.crisisType || "unknown").replace(/_/g, " ")}</p></div>
                        <div><p className="text-xs text-muted-foreground">AI Confidence</p><p className="text-sm font-semibold">{(parseFloat(row.aiConfidence) * 100).toFixed(0)}%</p></div>
                        <div><p className="text-xs text-muted-foreground">Urgency</p><p className="text-sm font-semibold">{row.aiUrgency ? (parseFloat(row.aiUrgency) * 100).toFixed(0) + "%" : "—"}</p></div>
                        <div><p className="text-xs text-muted-foreground">Incident ID</p><p className="text-xs font-mono text-muted-foreground">{row.incidentId.slice(0, 12)}…</p></div>
                      </div>
                      {row.overriddenDecision && row.status === "overridden" && (
                        <div className="mt-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
                          <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1">Override applied</p>
                          <p className="text-xs text-red-600 capitalize">{row.overriddenDecision.crisisType} — {row.overriddenDecision.severity}</p>
                          {row.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {row.reason}</p>}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{new Date(row.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {row.status === "pending_review" && (
                      <Button size="sm" className="flex-shrink-0 h-8 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => { setReviewId(row.id); setNewSeverity(row.originalDecision?.severity || "high"); setNewType(row.originalDecision?.crisisType || "other"); }}>
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Review dialog */}
        <Dialog open={!!reviewId} onOpenChange={v => !v && setReviewId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Review AI Decision</DialogTitle></DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">AI Original Decision</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Crisis Type", value: (selectedRecord.originalDecision?.crisisType || "—").replace(/_/g, " ") },
                      { label: "Severity",    value: selectedRecord.originalDecision?.severity || "—"                         },
                      { label: "Confidence",  value: `${(parseFloat(selectedRecord.aiConfidence) * 100).toFixed(0)}%`         },
                      { label: "Urgency",     value: selectedRecord.aiUrgency ? `${(parseFloat(selectedRecord.aiUrgency) * 100).toFixed(0)}%` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold capitalize">{value}</p></div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Action</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setOverrideAction("approve")}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${overrideAction === "approve" ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "border-border hover:border-green-300"}`}>
                      <CheckCircle className="w-5 h-5 mb-1.5 mx-auto" />Approve AI
                    </button>
                    <button onClick={() => setOverrideAction("override")}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all ${overrideAction === "override" ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "border-border hover:border-red-300"}`}>
                      <AlertTriangle className="w-5 h-5 mb-1.5 mx-auto" />Override
                    </button>
                  </div>
                </div>

                {overrideAction === "override" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">New Severity</Label>
                      <Select value={newSeverity} onValueChange={setNewSeverity}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{SEVERITY_OPTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">New Type</Label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Reason / Notes (audit trail)</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Explain your decision…" className="text-sm" />
                </div>

                <Button className={`w-full font-semibold ${overrideAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
                  onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? "Submitting…" : overrideAction === "approve" ? "✓ Approve AI Decision" : "⚡ Submit Override"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}
