import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShieldCheck, Download, Trash2, FileText, Lock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Consent {
  id: string;
  consentType: string;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  version: string;
}

interface RetentionPolicy {
  policyVersion: string;
  lastReviewed: string;
  retentionRules: {
    dataType: string;
    retainDays: number | null;
    anonymizeAfterDays: number | null;
    legalBasis: string;
    note?: string;
  }[];
  userRights: string[];
  dpa: string;
}

const consentLabels: Record<string, string> = {
  data_processing: "Data Processing",
  location_tracking: "Location Tracking",
  analytics: "Analytics & Insights",
  marketing: "Marketing Communications",
  third_party_sharing: "Third-Party Data Sharing",
};

const consentDescriptions: Record<string, string> = {
  data_processing: "Processing your personal data to operate CrisisConnect services",
  location_tracking: "Using your location to route emergency services and alerts",
  analytics: "Anonymized usage analytics to improve platform performance",
  marketing: "Receiving updates, newsletters, and product announcements",
  third_party_sharing: "Sharing anonymized data with government agencies and research partners",
};

export default function CompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: consentsData } = useQuery<{ consents: Consent[] }>({
    queryKey: ["/api/compliance/me/consents"],
  });
  const { data: retentionPolicy } = useQuery<RetentionPolicy>({
    queryKey: ["/api/compliance/data-retention"],
  });

  const consentMutation = useMutation({
    mutationFn: async ({ consentType, granted }: { consentType: string; granted: boolean }) =>
      apiRequest("/api/compliance/me/consent", {
        method: "POST",
        body: JSON.stringify({ consentType, granted }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/me/consents"] });
      toast({ title: "Consent preference saved" });
    },
    onError: () => toast({ title: "Failed to save preference", variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/compliance/me/export", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crisisconnect-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast({ title: "Data export downloaded" }),
    onError: () => toast({ title: "Export failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiRequest("/api/compliance/me/account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE_MY_ACCOUNT" }),
      }),
    onSuccess: () => {
      toast({ title: "Account deleted. You will be logged out." });
      setTimeout(() => { window.location.href = "/"; }, 2000);
    },
    onError: () => toast({ title: "Deletion failed", variant: "destructive" }),
  });

  const consents = consentsData?.consents || [];
  const latestConsents = Object.fromEntries(
    Object.keys(consentLabels).map(type => {
      const c = consents.filter(c => c.consentType === type).sort((a, b) =>
        new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime()
      )[0];
      return [type, c?.granted ?? false];
    })
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-green-600" />
            Privacy & Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            GDPR-style data rights — manage your consents, export your data, and control your account
          </p>
        </div>

        <Tabs defaultValue="consents">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="consents">Consents</TabsTrigger>
            <TabsTrigger value="export">Data Export</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="delete">Delete</TabsTrigger>
          </TabsList>

          {/* CONSENTS */}
          <TabsContent value="consents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consent Management</CardTitle>
                <CardDescription>
                  Control how CrisisConnect uses your personal data. These preferences are recorded with a timestamp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(consentLabels).map(([type, label]) => (
                  <div key={type} className="flex items-start justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`consent-${type}`} className="font-medium cursor-pointer">{label}</Label>
                        {latestConsents[type] ? (
                          <Badge variant="default" className="text-xs bg-green-600">Granted</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Not granted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{consentDescriptions[type]}</p>
                    </div>
                    <Switch
                      id={`consent-${type}`}
                      checked={latestConsents[type]}
                      onCheckedChange={(checked) => consentMutation.mutate({ consentType: type, granted: checked })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {consents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consent History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {consents.slice(0, 20).map(c => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          {c.granted ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                          <span>{consentLabels[c.consentType] || c.consentType}</span>
                          <Badge variant="outline" className="text-xs">v{c.version}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(c.grantedAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* DATA EXPORT */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Your Data
                </CardTitle>
                <CardDescription>
                  Download a complete copy of all data CrisisConnect holds about you, in JSON format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Profile & Account", desc: "Name, email, role, timestamps" },
                    { label: "Disaster Reports", desc: "All reports you submitted" },
                    { label: "SOS Alerts", desc: "Your emergency activations" },
                    { label: "Resource Requests", desc: "Aid & resource requests" },
                    { label: "Consent Records", desc: "All consent decisions" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2 p-3 border rounded-lg">
                      <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Alert>
                  <Lock className="w-4 h-4" />
                  <AlertDescription>
                    Your export is generated in real-time and contains only your personal data. Sensitive fields like passwords are excluded.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  {exportMutation.isPending ? "Preparing export..." : "Download My Data (JSON)"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DATA RETENTION */}
          <TabsContent value="retention" className="space-y-4">
            {retentionPolicy ? (
              <Card>
                <CardHeader>
                  <CardTitle>Data Retention Policy</CardTitle>
                  <CardDescription>
                    Policy v{retentionPolicy.policyVersion} — Last reviewed {retentionPolicy.lastReviewed}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 font-medium">Data Type</th>
                          <th className="text-right py-2 font-medium">Retain (days)</th>
                          <th className="text-right py-2 font-medium">Anonymize</th>
                          <th className="text-left py-2 font-medium pl-4">Legal Basis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retentionPolicy.retentionRules.map(rule => (
                          <tr key={rule.dataType} className="border-b last:border-0">
                            <td className="py-2 font-medium">{rule.dataType.replace(/_/g, " ")}</td>
                            <td className="py-2 text-right">{rule.retainDays ?? "Until deleted"}</td>
                            <td className="py-2 text-right">{rule.anonymizeAfterDays ? `${rule.anonymizeAfterDays}d` : "—"}</td>
                            <td className="py-2 pl-4">
                              <Badge variant="outline" className="text-xs">{rule.legalBasis.replace(/_/g, " ")}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Your Rights</p>
                    <div className="flex flex-wrap gap-2">
                      {retentionPolicy.userRights.map(right => (
                        <Badge key={right} variant="secondary" className="capitalize">{right}</Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Data Protection contact: {retentionPolicy.dpa}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center text-muted-foreground py-12">Policy not available for your role.</div>
            )}
          </TabsContent>

          {/* DELETE ACCOUNT */}
          <TabsContent value="delete" className="space-y-4">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" />
                  Delete My Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and anonymize your submitted reports. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Your profile, consents, and device records will be permanently deleted. Your disaster reports will be anonymized and retained for public safety records per data retention policy.
                  </AlertDescription>
                </Alert>
                {!showDeleteDialog ? (
                  <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Request Account Deletion
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                    <p className="text-sm font-medium">Type <code className="bg-muted px-1 rounded">DELETE_MY_ACCOUNT</code> to confirm:</p>
                    <input
                      className="w-full border rounded px-3 py-2 text-sm font-mono"
                      value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder="DELETE_MY_ACCOUNT"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        disabled={deleteConfirm !== "DELETE_MY_ACCOUNT" || deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate()}
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Confirm Permanent Deletion"}
                      </Button>
                      <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
