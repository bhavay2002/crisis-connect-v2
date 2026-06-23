import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Megaphone, Radio, AlertTriangle, Info, Clock, Globe, Loader2,
  Smartphone, Wifi, Bell, FileText, CheckCircle, Shield,
  MessageSquare, Broadcast, Signal,
} from "lucide-react";

interface BroadcastAlert {
  id: string; title: string; message: string;
  severity: "info" | "warning" | "critical";
  scope: "global" | "regional"; createdBy: string;
  createdAt: string; expiresAt?: string;
}

const SEVERITY: Record<string, { badge: string; bar: string; icon: any }> = {
  info:     { badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",     bar: "bg-blue-500",   icon: Info          },
  warning:  { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300", bar: "bg-yellow-500", icon: AlertTriangle  },
  critical: { badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",         bar: "bg-red-500",    icon: AlertTriangle  },
};

function ActiveAlertsList({ alerts }: { alerts: BroadcastAlert[] }) {
  if (alerts.length === 0) return (
    <div className="rounded-2xl border bg-background p-10 text-center">
      <Globe className="w-9 h-9 mx-auto mb-2 opacity-20" />
      <p className="font-semibold text-sm">No active alerts</p>
      <p className="text-xs text-muted-foreground mt-1">All clear — issue an alert above if needed</p>
    </div>
  );
  return (
    <div className="space-y-3">
      {alerts.map(alert => {
        const s = SEVERITY[alert.severity] || SEVERITY.info;
        const Icon = s.icon;
        return (
          <div key={alert.id} className="relative overflow-hidden rounded-xl border bg-background p-4">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
            <div className="pl-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-sm">{alert.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${s.badge}`}>{alert.severity}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground capitalize">{alert.scope}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
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
  );
}

// ── CAP Alerts (Common Alerting Protocol) ─────────────────────────────────────

function CAPTab({ alerts }: { alerts: BroadcastAlert[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", message: "", severity: "info",
    scope: "global", expiresInMinutes: "60",
    event: "", certainty: "likely", urgency: "immediate",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => apiRequest<BroadcastAlert>("/api/alerts/broadcast", {
      method: "POST",
      body: JSON.stringify({ title: form.title, message: form.message, severity: form.severity, scope: form.scope, expiresInMinutes: parseInt(form.expiresInMinutes) }),
    }),
    onSuccess: (alert) => {
      qc.invalidateQueries({ queryKey: ["/api/alerts/broadcast"] });
      setForm({ title: "", message: "", severity: "info", scope: "global", expiresInMinutes: "60", event: "", certainty: "likely", urgency: "immediate" });
      toast({ title: "CAP alert issued", description: `"${alert.title}" broadcast successfully` });
    },
    onError: () => toast({ title: "Failed to issue alert", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1 bg-red-600" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-red-500" />
            </div>
            <h2 className="font-black text-sm">Issue CAP Alert</h2>
            <span className="text-xs text-muted-foreground">Common Alerting Protocol v1.2</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Flash Flood Warning — Mumbai Region" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event Type</Label>
              <Input value={form.event} onChange={e => setForm(f => ({ ...f, event: e.target.value }))} placeholder="Flash Flood, Earthquake, Cyclone…" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Message</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Detailed instructions for the public…" rows={3} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Minor</SelectItem>
                  <SelectItem value="warning">Moderate</SelectItem>
                  <SelectItem value="critical">Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Urgency</Label>
              <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="expected">Expected</SelectItem>
                  <SelectItem value="future">Future</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certainty</Label>
              <Select value={form.certainty} onValueChange={v => setForm(f => ({ ...f, certainty: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="observed">Observed</SelectItem>
                  <SelectItem value="likely">Likely</SelectItem>
                  <SelectItem value="possible">Possible</SelectItem>
                  <SelectItem value="unlikely">Unlikely</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</Label>
              <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Public (All)</SelectItem>
                  <SelectItem value="regional">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expires (min)</Label>
              <Input type="number" value={form.expiresInMinutes} onChange={e => setForm(f => ({ ...f, expiresInMinutes: e.target.value }))} min="5" max="1440" />
            </div>
          </div>

          <Button onClick={() => mutate()} disabled={isPending || !form.title || !form.message} className="w-full bg-red-600 hover:bg-red-700 text-white">
            {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Issuing…</> : <><Radio className="w-4 h-4 mr-2" />Issue CAP Alert</>}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold text-sm">Active CAP Alerts</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-semibold">{alerts.length}</span>
        </div>
        <ActiveAlertsList alerts={alerts} />
      </div>
    </div>
  );
}

// ── SMS Broadcast ─────────────────────────────────────────────────────────────

function SMSTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ recipient: "all", numbers: "", message: "", sender: "CRISIS-GOV" });

  const charCount = form.message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-5">
      <Alert>
        <Smartphone className="w-4 h-4" />
        <AlertDescription className="text-xs">SMS Broadcast is delivered via the registered telecom gateway. Standard carrier rates apply. Max 1,600 chars (10 SMS segments).</AlertDescription>
      </Alert>

      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1 bg-green-600" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5 text-green-500" />
            </div>
            <h2 className="font-black text-sm">Compose SMS Broadcast</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sender ID</Label>
              <Input value={form.sender} onChange={e => setForm(f => ({ ...f, sender: e.target.value }))} placeholder="CRISIS-GOV" maxLength={11} />
              <p className="text-[10px] text-muted-foreground">Max 11 chars alphanumeric</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipients</Label>
              <Select value={form.recipient} onValueChange={v => setForm(f => ({ ...f, recipient: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registered Users</SelectItem>
                  <SelectItem value="volunteers">Volunteers Only</SelectItem>
                  <SelectItem value="agencies">Agency Staff Only</SelectItem>
                  <SelectItem value="custom">Custom Numbers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.recipient === "custom" && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone Numbers</Label>
              <Textarea value={form.numbers} onChange={e => setForm(f => ({ ...f, numbers: e.target.value }))} placeholder="+91-9876543210, +91-9876543211 (one per line or comma-separated)" rows={3} />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Emergency: Flood warning in your area. Evacuate immediately to designated shelter. -NDMA" rows={4} maxLength={1600} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{charCount}/1600 characters</span>
              <span>{smsCount} SMS segment{smsCount > 1 ? "s" : ""}</span>
            </div>
          </div>

          <Button onClick={() => toast({ title: "SMS queued", description: "SMS broadcast has been queued for delivery" })} disabled={!form.message} className="w-full bg-green-600 hover:bg-green-700 text-white">
            <Smartphone className="w-4 h-4 mr-2" />Send SMS Broadcast
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-5 space-y-3">
        <p className="font-bold text-sm">Delivery Statistics</p>
        <div className="grid grid-cols-3 gap-3">
          {[{ label: "Sent Today", value: "0" }, { label: "Delivered", value: "0" }, { label: "Failed", value: "0" }].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cell Broadcast ────────────────────────────────────────────────────────────

function CellBroadcastTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "emergency", message: "", area: "nationwide", channel: "4370", language: "en" });

  return (
    <div className="space-y-5">
      <Alert>
        <Signal className="w-4 h-4" />
        <AlertDescription className="text-xs">Cell Broadcast (ETWS/CMAS) reaches all mobile devices in the target area regardless of registration. No opt-out possible for Presidential alerts. Requires carrier integration.</AlertDescription>
      </Alert>

      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1 bg-orange-600" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Signal className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <h2 className="font-black text-sm">Cell Broadcast Message</h2>
            <span className="text-xs text-muted-foreground">ETWS / WEA / CMAS</span>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Extreme Emergency</SelectItem>
                  <SelectItem value="severe">Severe Alert</SelectItem>
                  <SelectItem value="amber">AMBER Alert</SelectItem>
                  <SelectItem value="test">System Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel (GSM)</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4370">4370 — Extreme (default)</SelectItem>
                  <SelectItem value="4371">4371 — Severe</SelectItem>
                  <SelectItem value="4372">4372 — AMBER</SelectItem>
                  <SelectItem value="4380">4380 — Presidential</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affected Area</Label>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nationwide">Nationwide</SelectItem>
                  <SelectItem value="state">State-wide</SelectItem>
                  <SelectItem value="district">District</SelectItem>
                  <SelectItem value="custom">Custom Polygon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message (max 90 chars for ETWS)</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="EMERGENCY ALERT: Flash flood. Move to high ground NOW." rows={3} maxLength={300} />
            <p className="text-[10px] text-muted-foreground text-right">{form.message.length}/300 chars</p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-3">
            <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1">⚠️ Preview — Device will display:</p>
            <div className="bg-background border rounded-lg p-2 text-xs font-medium">{form.message || "Your message will appear here on recipient devices."}</div>
          </div>

          <Button onClick={() => toast({ title: "Cell broadcast scheduled", description: "Carrier integration required for production delivery" })} disabled={!form.message} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
            <Signal className="w-4 h-4 mr-2" />Send Cell Broadcast
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Push Notifications ────────────────────────────────────────────────────────

function PushTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", body: "", target: "all", sound: true, badge: true, priority: "high" });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="h-1 bg-purple-600" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <h2 className="font-black text-sm">Push Notification Broadcast</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notification Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="⚠️ Flash Flood Warning" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Audience</Label>
              <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="affected-area">Affected Area</SelectItem>
                  <SelectItem value="volunteers">Volunteers</SelectItem>
                  <SelectItem value="agencies">Agencies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notification Body</Label>
            <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Immediate evacuation required for low-lying areas. Tap for shelter locations." rows={3} maxLength={200} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (bypass DND)</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background p-3">
              <div><p className="text-xs font-semibold">Sound</p><p className="text-[10px] text-muted-foreground">Alert tone</p></div>
              <Switch checked={form.sound} onCheckedChange={v => setForm(f => ({ ...f, sound: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background p-3">
              <div><p className="text-xs font-semibold">Badge</p><p className="text-[10px] text-muted-foreground">App icon badge</p></div>
              <Switch checked={form.badge} onCheckedChange={v => setForm(f => ({ ...f, badge: v }))} />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border p-4 bg-muted/30">
            <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Preview</p>
            <div className="bg-background border rounded-xl p-3 shadow-sm max-w-xs">
              <p className="text-xs font-bold">{form.title || "Notification Title"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{form.body || "Notification body text will appear here."}</p>
            </div>
          </div>

          <Button onClick={() => toast({ title: "Push notification sent", description: `Delivered to ${form.target === "all" ? "all users" : form.target}` })} disabled={!form.title || !form.body} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            <Bell className="w-4 h-4 mr-2" />Send Push Notification
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Public Warnings Registry ──────────────────────────────────────────────────

function PublicWarningsTab({ alerts }: { alerts: BroadcastAlert[] }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-background p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Official Public Warning Registry</p>
            <p className="text-xs text-muted-foreground">All issued emergency warnings — publicly accessible log</p>
          </div>
          <Badge variant="outline" className="text-xs">{alerts.length} active</Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="font-semibold text-green-600">No active public warnings</p>
            <p className="text-xs text-muted-foreground mt-1">All clear — no warnings have been issued</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, i) => {
              const s = SEVERITY[alert.severity] || SEVERITY.info;
              return (
                <div key={alert.id} className="rounded-xl border bg-background p-4 flex items-start gap-4">
                  <div className="text-center flex-shrink-0">
                    <p className="text-2xl font-black text-muted-foreground/40">#{i + 1}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm">{alert.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${s.badge}`}>{alert.severity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Issued {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                      {alert.expiresAt && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Expires {formatDistanceToNow(new Date(alert.expiresAt), { addSuffix: true })}</span>}
                      <span className="capitalize">{alert.scope}</span>
                    </div>
                  </div>
                  <Badge className="text-xs capitalize flex-shrink-0 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">Active</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-muted/20 p-5 space-y-2">
        <p className="font-bold text-sm">Compliance Notice</p>
        <p className="text-xs text-muted-foreground">All public warnings issued through this system are automatically logged and subject to audit. Warnings must be issued in accordance with the Disaster Management Act and applicable state regulations. False or misleading alerts are a criminal offence.</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { data } = useQuery<{ alerts: BroadcastAlert[]; total: number }>({
    queryKey: ["/api/alerts/broadcast"],
    refetchInterval: 30_000,
  });

  const alerts = data?.alerts ?? [];
  const critical = alerts.filter(a => a.severity === "critical").length;

  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get("tab") || "cap";

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-red-500" />
            </div>
            <h1 className="text-2xl font-black">Alerts & Warning Systems</h1>
          </div>
          <p className="text-sm text-muted-foreground">Multi-channel emergency broadcast — CAP · SMS · Cell Broadcast · Push · Public Warnings</p>
        </div>
        <div className="flex items-center gap-2">
          {critical > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full font-bold bg-red-50 border border-red-300 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300 animate-pulse">
              {critical} CRITICAL ACTIVE
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full border font-medium text-muted-foreground">
            {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "CAP Alerts",    icon: FileText,    value: alerts.length,                                        color: "text-red-500",    bg: "bg-red-500/10"    },
          { label: "SMS",           icon: Smartphone,  value: "—",                                                   color: "text-green-500",  bg: "bg-green-500/10"  },
          { label: "Cell Broadcast",icon: Signal,      value: "—",                                                   color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Push",          icon: Bell,        value: "—",                                                   color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Critical",      icon: AlertTriangle,value: critical,                                             color: "text-red-600",    bg: "bg-red-600/10"    },
        ].map(({ label, icon: Icon, value, color, bg }) => (
          <div key={label} className="rounded-xl border bg-background p-3 shadow-sm flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className={`font-black ${typeof value === "number" ? "text-xl" : "text-sm"} ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="cap"   className="text-xs"><FileText   className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />CAP Alerts</TabsTrigger>
          <TabsTrigger value="sms"   className="text-xs"><Smartphone className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />SMS Broadcast</TabsTrigger>
          <TabsTrigger value="cell"  className="text-xs"><Signal     className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Cell Broadcast</TabsTrigger>
          <TabsTrigger value="push"  className="text-xs"><Bell       className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Push Notifications</TabsTrigger>
          <TabsTrigger value="public"className="text-xs"><Globe      className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Public Warnings</TabsTrigger>
        </TabsList>

        <TabsContent value="cap"    className="mt-5"><CAPTab alerts={alerts} /></TabsContent>
        <TabsContent value="sms"    className="mt-5"><SMSTab /></TabsContent>
        <TabsContent value="cell"   className="mt-5"><CellBroadcastTab /></TabsContent>
        <TabsContent value="push"   className="mt-5"><PushTab /></TabsContent>
        <TabsContent value="public" className="mt-5"><PublicWarningsTab alerts={alerts} /></TabsContent>
      </Tabs>
    </div>
  );
}
