import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Radio, AlertTriangle, Info, Megaphone, Clock, Globe, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BroadcastAlert {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  scope: "global" | "regional";
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}

const SEVERITY_STYLES: Record<string, { badge: string; icon: any; alert: string }> = {
  info: {
    badge: "bg-blue-100 text-blue-700",
    icon: Info,
    alert: "border-blue-300 bg-blue-50 dark:bg-blue-950",
  },
  warning: {
    badge: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
    alert: "border-yellow-300 bg-yellow-50 dark:bg-yellow-950",
  },
  critical: {
    badge: "bg-red-100 text-red-700",
    icon: AlertTriangle,
    alert: "border-red-400 bg-red-50 dark:bg-red-950",
  },
};

export default function BroadcastAlerts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", message: "", severity: "info",
    scope: "global", expiresInMinutes: "60",
  });

  const { data } = useQuery<{ alerts: BroadcastAlert[]; total: number }>({
    queryKey: ["/api/alerts/broadcast"],
    refetchInterval: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => apiRequest<BroadcastAlert>("/api/alerts/broadcast", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        expiresInMinutes: parseInt(form.expiresInMinutes),
      }),
    }),
    onSuccess: (alert) => {
      qc.invalidateQueries({ queryKey: ["/api/alerts/broadcast"] });
      setForm({ title: "", message: "", severity: "info", scope: "global", expiresInMinutes: "60" });
      toast({
        title: "Broadcast alert sent",
        description: `"${alert.title}" broadcast to all users`,
      });
    },
    onError: () => toast({ title: "Failed to send alert", variant: "destructive" }),
  });

  const alerts = data?.alerts ?? [];

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-red-500" />
            </div>
            <h1 className="text-2xl font-black">Broadcast Alert System</h1>
          </div>
          <p className="text-sm text-muted-foreground">Send real-time alerts to all connected users via WebSocket</p>
        </div>

        {/* Compose form */}
        <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
          <div className="h-1 bg-red-600" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-red-500" />
              </div>
              <h2 className="font-black text-sm">Send New Broadcast</h2>
              <span className="text-xs text-muted-foreground">Delivered instantly via WebSocket</span>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Flash Flood Warning — Mumbai Region" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Detailed alert message for all users..." rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</Label>
                <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (all users)</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expires in (minutes)</Label>
                <Input type="number" value={form.expiresInMinutes}
                  onChange={e => setForm(f => ({ ...f, expiresInMinutes: e.target.value }))}
                  min="5" max="1440" className="mt-1" />
              </div>
            </div>
            <Button onClick={() => mutate()} disabled={isPending || !form.title || !form.message}
              className="w-full bg-red-600 hover:bg-red-700 text-white">
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Broadcasting…</> : <><Radio className="w-4 h-4 mr-2" />Broadcast Alert</>}
            </Button>
          </div>
        </div>

        {/* Active alerts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold text-sm">Active Alerts</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-semibold">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <div className="rounded-2xl border bg-background p-10 text-center">
              <Globe className="w-9 h-9 mx-auto mb-2 opacity-20" />
              <p className="font-semibold text-sm">No active broadcast alerts</p>
              <p className="text-xs text-muted-foreground mt-1">All clear — send an alert above if needed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => {
                const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const Icon = styles.icon;
                return (
                  <div key={alert.id} className={`relative overflow-hidden rounded-xl border p-4 ${styles.alert}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-yellow-500" : "bg-blue-500"
                    }`} />
                    <div className="pl-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-bold text-sm">{alert.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${styles.badge}`}>{alert.severity}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground capitalize">{alert.scope}</span>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            {alert.expiresAt && ` · Expires ${formatDistanceToNow(new Date(alert.expiresAt), { addSuffix: true })}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
