import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Key, Webhook, Copy, Trash2, PlusCircle, AlertTriangle, CheckCircle, Code, Globe } from "lucide-react";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  dailyLimit: number;
  requestCount: number;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastDeliveredAt?: string;
  createdAt: string;
}

const tierColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  paid: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const AVAILABLE_EVENTS = [
  "crisis.created", "crisis.updated", "crisis.resolved",
  "sos.created", "sos.resolved", "alert.broadcast",
];

export default function DeveloperPlatformPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyTier, setNewKeyTier] = useState("free");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isKeyOpen, setIsKeyOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["crisis.created"]);
  const [isWebhookOpen, setIsWebhookOpen] = useState(false);

  const { data: keysData } = useQuery<{ keys: ApiKeyRecord[] }>({ queryKey: ["/api/developer/keys"] });
  const { data: webhooksData } = useQuery<{ webhooks: WebhookRecord[] }>({ queryKey: ["/api/developer/webhooks"] });

  const createKeyMutation = useMutation({
    mutationFn: async () =>
      apiRequest("/api/developer/keys", { method: "POST", body: JSON.stringify({ name: newKeyName, tier: newKeyTier }) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/keys"] });
      setCreatedKey(data.key);
      setIsKeyOpen(false);
      toast({ title: "API key created — save it now, it won't be shown again!" });
    },
    onError: () => toast({ title: "Failed to create API key", variant: "destructive" }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/developer/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/developer/keys"] }); toast({ title: "Key revoked" }); },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () =>
      apiRequest("/api/developer/webhooks", { method: "POST", body: JSON.stringify({ url: webhookUrl, events: webhookEvents }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developer/webhooks"] });
      setIsWebhookOpen(false);
      setWebhookUrl("");
      toast({ title: "Webhook registered — check your secret in the response" });
    },
    onError: () => toast({ title: "Failed to register webhook", variant: "destructive" }),
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/developer/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/developer/webhooks"] }); toast({ title: "Webhook deleted" }); },
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/developer/webhooks/${id}/test`, { method: "POST" }),
    onSuccess: () => toast({ title: "Test event dispatched to webhook" }),
    onError: () => toast({ title: "Dispatch failed", variant: "destructive" }),
  });

  const keys = keysData?.keys || [];
  const webhooks = webhooksData?.webhooks || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Code className="w-4 h-4 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-black">Developer Platform</h1>
          </div>
          <p className="text-sm text-muted-foreground">API keys, webhooks, and public v1 API for third-party integrations</p>
        </div>

        {createdKey && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-green-700">Your API key (save it now — shown only once):</p>
                <code className="font-mono text-sm break-all">{createdKey}</code>
              </div>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdKey); toast({ title: "Copied!" }); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="keys">
          <TabsList className="h-9">
            <TabsTrigger value="keys" className="text-xs"><Key className="w-3.5 h-3.5 mr-1.5" />API Keys <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted font-bold">{keys.length}</span></TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs"><Webhook className="w-3.5 h-3.5 mr-1.5" />Webhooks <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted font-bold">{webhooks.length}</span></TabsTrigger>
            <TabsTrigger value="docs" className="text-xs"><Globe className="w-3.5 h-3.5 mr-1.5" />API Docs</TabsTrigger>
          </TabsList>

          {/* API KEYS */}
          <TabsContent value="keys" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{keys.length}/10 keys used</p>
              <Dialog open={isKeyOpen} onOpenChange={setIsKeyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"><PlusCircle className="w-3.5 h-3.5 mr-1.5" />New API Key</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Key Name</Label><Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="My Integration" className="mt-1" /></div>
                    <div>
                      <Label>Tier</Label>
                      <Select value={newKeyTier} onValueChange={setNewKeyTier}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free — 100 req/day</SelectItem>
                          <SelectItem value="paid">Paid — 10,000 req/day</SelectItem>
                          <SelectItem value="enterprise">Enterprise — 1M req/day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createKeyMutation.mutate()} disabled={!newKeyName || createKeyMutation.isPending}>
                      {createKeyMutation.isPending ? "Creating…" : "Create Key"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {keys.length === 0 ? (
              <div className="rounded-2xl border bg-background p-10 text-center">
                <Key className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No API keys yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first key to start integrating</p>
              </div>
            ) : keys.map(k => (
              <div key={k.id} className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-sm">{k.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tierColors[k.tier]}`}>{k.tier}</span>
                      {!k.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Revoked</span>}
                    </div>
                    <code className="text-xs text-muted-foreground font-mono">{k.keyPrefix}{'•'.repeat(36)}</code>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>{k.requestCount}/{k.dailyLimit} req today</span>
                      {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                      <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-2.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min((k.requestCount / k.dailyLimit) * 100, 100)}%` }} />
                    </div>
                  </div>
                  {k.isActive && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 h-8 w-8 p-0" onClick={() => revokeKeyMutation.mutate(k.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* WEBHOOKS */}
          <TabsContent value="webhooks" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Dialog open={isWebhookOpen} onOpenChange={setIsWebhookOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"><PlusCircle className="w-3.5 h-3.5 mr-1.5" />Register Webhook</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Register Webhook Endpoint</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Endpoint URL</Label><Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-app.com/webhook" className="mt-1" /></div>
                    <div>
                      <Label>Events (select multiple)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {AVAILABLE_EVENTS.map(ev => (
                          <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={webhookEvents.includes(ev)}
                              onChange={e => setWebhookEvents(prev => e.target.checked ? [...prev, ev] : prev.filter(x => x !== ev))} />
                            <code className="text-xs">{ev}</code>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => createWebhookMutation.mutate()}
                      disabled={!webhookUrl || webhookEvents.length === 0 || createWebhookMutation.isPending}>
                      {createWebhookMutation.isPending ? "Registering…" : "Register Webhook"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {webhooks.length === 0 ? (
              <div className="rounded-2xl border bg-background p-10 text-center">
                <Webhook className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No webhooks yet</p>
                <p className="text-xs text-muted-foreground mt-1">Register an endpoint to start receiving events</p>
              </div>
            ) : webhooks.map(wh => (
              <div key={wh.id} className="rounded-2xl border bg-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      <code className="text-sm font-medium">{wh.url}</code>
                      {!wh.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Disabled</span>}
                      {wh.failureCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">{wh.failureCount} failures</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {wh.events.map(ev => <span key={ev} className="text-xs px-2 py-0.5 rounded-full border font-mono">{ev}</span>)}
                    </div>
                    {wh.lastDeliveredAt && <p className="text-xs text-muted-foreground">Last delivered {new Date(wh.lastDeliveredAt).toLocaleString()}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => testWebhookMutation.mutate(wh.id)}>Test</Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 h-8 w-8 p-0" onClick={() => deleteWebhookMutation.mutate(wh.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* API DOCS */}
          <TabsContent value="docs" className="mt-4">
            <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
              <div className="h-1 bg-indigo-600" />
              <div className="p-5 space-y-4">
                <div className="mb-1">
                  <h2 className="font-black text-sm">Public v1 API Reference</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Base URL: your-domain.com · Auth: <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;API_KEY&gt;</code></p>
                </div>
                {[
                  { method: "POST", path: "/v1/crisis/report", desc: "Submit a crisis report", body: `{"message":"Accident on highway","location":"NH-44 km 120","type":"road_accident","severity":"high"}` },
                  { method: "GET",  path: "/v1/crisis/alerts?limit=20", desc: "Fetch recent crisis alerts", body: null },
                  { method: "GET",  path: "/v1/crisis/:id", desc: "Get incident details by ID", body: null },
                ].map(ep => (
                  <div key={ep.path} className="rounded-xl border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold text-white ${ep.method === "POST" ? "bg-green-600" : "bg-blue-600"}`}>{ep.method}</span>
                      <code className="text-sm font-mono">{ep.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{ep.desc}</p>
                    {ep.body && <pre className="bg-muted rounded-lg p-2 text-xs overflow-x-auto">{ep.body}</pre>}
                  </div>
                ))}
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs font-bold mb-2">Rate Limits</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-center">
                    {[["Free", "100 req/day"], ["Paid", "10,000 req/day"], ["Enterprise", "1M req/day"]].map(([tier, limit]) => (
                      <div key={tier} className="rounded-lg bg-background border p-2">
                        <p className="font-bold">{tier}</p>
                        <p className="text-muted-foreground">{limit}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs font-bold mb-2">Webhook Signature Verification</p>
                  <pre className="text-xs bg-muted rounded-lg p-2 overflow-x-auto">{`// Verify X-CrisisConnect-Signature header
const sig = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');
if ('sha256=' + sig !== header) throw new Error('Invalid signature');`}</pre>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
