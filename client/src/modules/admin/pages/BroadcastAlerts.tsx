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
import DashboardLayout from "@/components/layout/DashboardLayout";
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
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-red-600" />
            Broadcast Alert System
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Send real-time alerts to all connected users via WebSocket
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Send New Broadcast
            </CardTitle>
            <CardDescription>
              Alerts are delivered instantly to all connected users via WebSocket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Alert Title</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Flash Flood Warning — Mumbai Region"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Detailed alert message for all users..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (all users)</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expires in (minutes)</Label>
                <Input
                  type="number"
                  value={form.expiresInMinutes}
                  onChange={e => setForm(f => ({ ...f, expiresInMinutes: e.target.value }))}
                  min="5"
                  max="1440"
                />
              </div>
            </div>
            <Button
              onClick={() => mutate()}
              disabled={isPending || !form.title || !form.message}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Broadcasting...</>
              ) : (
                <><Radio className="w-4 h-4 mr-2" />Broadcast Alert</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Alerts ({alerts.length})
          </h2>
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No active broadcast alerts
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => {
                const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const Icon = styles.icon;
                return (
                  <Alert key={alert.id} className={styles.alert}>
                    <Icon className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{alert.title}</span>
                            <Badge className={`text-xs ${styles.badge}`}>{alert.severity}</Badge>
                            <Badge variant="outline" className="text-xs">{alert.scope}</Badge>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            {alert.expiresAt && ` · Expires ${formatDistanceToNow(new Date(alert.expiresAt), { addSuffix: true })}`}
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
