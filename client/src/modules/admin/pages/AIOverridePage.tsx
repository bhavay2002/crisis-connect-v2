import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle, UserCheck, Eye, BarChart3 } from "lucide-react";

interface OverrideRecord {
  id: string; incidentId: string; incidentType: string;
  originalDecision: any; overriddenDecision?: any;
  aiConfidence: string; aiUrgency?: string;
  requiresHumanReview: boolean; status: string;
  overriddenBy?: string; reason?: string; notes?: string;
  createdAt: string; reviewedAt?: string;
}

interface OverrideStats {
  total: number; pending: number; approved: number;
  overridden: number; autoApproved: number; overrideRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-orange-100 text-orange-700",
  approved:       "bg-green-100 text-green-700",
  overridden:     "bg-red-100 text-red-700",
  auto_approved:  "bg-blue-100 text-blue-700",
};

const SEV_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
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
      body: JSON.stringify({
        action: overrideAction,
        overriddenDecision: overrideAction === "override" ? { crisisType: newType, severity: newSeverity } : undefined,
        reason,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-overrides"] });
      qc.invalidateQueries({ queryKey: ["/api/ai-overrides/stats/summary"] });
      setReviewId(null);
      setReason("");
      toast({ title: `Decision ${overrideAction === "approve" ? "approved" : "overridden"} successfully` });
    },
    onError: () => toast({ title: "Review failed", variant: "destructive" }),
  });

  const pending = pendingData?.overrides || [];
  const all = allData?.overrides || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            AI Decision Override — Human-in-the-Loop
          </h1>
          <p className="text-muted-foreground mt-1">
            Review AI classifications where confidence is low or severity is critical. Override or approve each decision.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Decisions", value: stats?.total ?? 0, color: "text-blue-600" },
            { label: "Pending Review",  value: stats?.pending ?? 0, color: stats?.pending ? "text-orange-600" : "text-green-600" },
            { label: "Approved",        value: stats?.approved ?? 0, color: "text-green-600" },
            { label: "Overridden",      value: stats?.overridden ?? 0, color: "text-red-600" },
            { label: "Override Rate",   value: `${stats?.overrideRate ?? 0}%`, color: "text-purple-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Pending alert */}
        {pending.length > 0 && (
          <Alert className="border-orange-400 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-700 font-medium">
              {pending.length} AI decision{pending.length > 1 ? "s" : ""} pending human review — confidence below threshold or critical severity
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending Review ({pending.length})</TabsTrigger>
            <TabsTrigger value="all">All Decisions ({all.length})</TabsTrigger>
          </TabsList>

          {[{ key: "pending", rows: pending }, { key: "all", rows: all }].map(({ key, rows }) => (
            <TabsContent key={key} value={key} className="space-y-3">
              {rows.length === 0 ? (
                <Card><CardContent className="text-center py-10 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
                  <p>{key === "pending" ? "No decisions pending review" : "No AI decisions recorded yet"}</p>
                </CardContent></Card>
              ) : rows.map(row => (
                <Card key={row.id} className={row.requiresHumanReview && row.status === "pending_review" ? "border-orange-300" : ""}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status]}`}>{row.status.replace(/_/g, " ")}</span>
                          {row.requiresHumanReview && <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">Flagged for review</Badge>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SEV_COLORS[row.originalDecision?.severity || "medium"]}`}>
                            {row.originalDecision?.severity || "unknown"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-xs text-muted-foreground">Crisis Type</p><p className="font-medium capitalize">{(row.originalDecision?.crisisType || "unknown").replace(/_/g, " ")}</p></div>
                          <div><p className="text-xs text-muted-foreground">Confidence</p><p className="font-medium">{(parseFloat(row.aiConfidence) * 100).toFixed(0)}%</p></div>
                          <div><p className="text-xs text-muted-foreground">Urgency</p><p className="font-medium">{row.aiUrgency ? (parseFloat(row.aiUrgency) * 100).toFixed(0) + "%" : "—"}</p></div>
                          <div><p className="text-xs text-muted-foreground">Incident</p><p className="font-medium text-xs truncate">{row.incidentId.slice(0, 12)}…</p></div>
                        </div>
                        {row.overriddenDecision && row.status === "overridden" && (
                          <div className="mt-2 bg-red-50 rounded p-2 text-sm">
                            <p className="text-xs font-semibold text-red-700">Override applied:</p>
                            <p className="text-xs text-red-600 capitalize">{row.overriddenDecision.crisisType} — {row.overriddenDecision.severity}</p>
                            {row.reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {row.reason}</p>}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{new Date(row.createdAt).toLocaleString()}</p>
                      </div>
                      {row.status === "pending_review" && (
                        <Button size="sm" onClick={() => { setReviewId(row.id); setNewSeverity(row.originalDecision?.severity || "high"); setNewType(row.originalDecision?.crisisType || "other"); }}>
                          <UserCheck className="w-4 h-4 mr-1" />Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Review dialog */}
        <Dialog open={!!reviewId} onOpenChange={v => !v && setReviewId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Review AI Decision</DialogTitle></DialogHeader>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-semibold mb-2">AI Original Decision</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground">Crisis Type</p><p className="capitalize">{(selectedRecord.originalDecision?.crisisType || "—").replace(/_/g, " ")}</p></div>
                    <div><p className="text-xs text-muted-foreground">Severity</p><p className="capitalize">{selectedRecord.originalDecision?.severity || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Confidence</p><p>{(parseFloat(selectedRecord.aiConfidence) * 100).toFixed(0)}%</p></div>
                    <div><p className="text-xs text-muted-foreground">Urgency</p><p>{selectedRecord.aiUrgency ? (parseFloat(selectedRecord.aiUrgency) * 100).toFixed(0) + "%" : "—"}</p></div>
                  </div>
                </div>

                <div>
                  <Label>Action</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => setOverrideAction("approve")}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-colors ${overrideAction === "approve" ? "border-green-500 bg-green-50 text-green-700" : "border-border"}`}>
                      <CheckCircle className="w-4 h-4 mb-1 mx-auto" />Approve AI decision
                    </button>
                    <button onClick={() => setOverrideAction("override")}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition-colors ${overrideAction === "override" ? "border-red-500 bg-red-50 text-red-700" : "border-border"}`}>
                      <AlertTriangle className="w-4 h-4 mb-1 mx-auto" />Override decision
                    </button>
                  </div>
                </div>

                {overrideAction === "override" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>New Severity</Label>
                      <Select value={newSeverity} onValueChange={setNewSeverity}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SEVERITY_OPTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>New Type</Label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Reason / Notes</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Explain your decision for the audit trail…" />
                </div>

                <Button className="w-full" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? "Submitting…" : overrideAction === "approve" ? "Approve AI Decision" : "Submit Override"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
