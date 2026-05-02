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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Code className="w-8 h-8 text-indigo-600" />
            Developer Platform
          </h1>
          <p className="text-muted-foreground mt-1">API keys, webhooks, and public v1 API for third-party integrations</p>
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
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="docs">API Docs</TabsTrigger>
          </TabsList>

          {/* API KEYS */}
          <TabsContent value="keys" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{keys.length}/10 keys used</p>
              <Dialog open={isKeyOpen} onOpenChange={setIsKeyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusCircle className="w-4 h-4 mr-2" />New API Key</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Key Name</Label><Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="My Integration" /></div>
                    <div>
                      <Label>Tier</Label>
                      <Select value={newKeyTier} onValueChange={setNewKeyTier}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free — 100 req/day</SelectItem>
                          <SelectItem value="paid">Paid — 10,000 req/day</SelectItem>
                          <SelectItem value="enterprise">Enterprise — 1M req/day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createKeyMutation.mutate()} disabled={!newKeyName || createKeyMutation.isPending}>
                      {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {keys.length === 0 ? (
              <Card><CardContent className="text-center py-10 text-muted-foreground"><Key className="w-10 h-10 mx-auto mb-2 opacity-40" />No API keys yet</CardContent></Card>
            ) : keys.map(k => (
              <Card key={k.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{k.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColors[k.tier]}`}>{k.tier}</span>
                        {!k.isActive && <Badge variant="destructive" className="text-xs">Revoked</Badge>}
                      </div>
                      <code className="text-xs text-muted-foreground">{k.keyPrefix}••••••••••••••••••••••••••••••••••••••</code>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{k.requestCount}/{k.dailyLimit} req today</span>
                        {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                        <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {k.isActive && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeKeyMutation.mutate(k.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((k.requestCount / k.dailyLimit) * 100, 100)}%` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* WEBHOOKS */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isWebhookOpen} onOpenChange={setIsWebhookOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><PlusCircle className="w-4 h-4 mr-2" />Register Webhook</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Register Webhook Endpoint</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Endpoint URL</Label><Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-app.com/webhook" /></div>
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
                      {createWebhookMutation.isPending ? "Registering..." : "Register Webhook"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {webhooks.length === 0 ? (
              <Card><CardContent className="text-center py-10 text-muted-foreground"><Webhook className="w-10 h-10 mx-auto mb-2 opacity-40" />No webhooks yet</CardContent></Card>
            ) : webhooks.map(wh => (
              <Card key={wh.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <code className="text-sm font-medium">{wh.url}</code>
                        {!wh.isActive && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                        {wh.failureCount > 0 && <Badge variant="secondary" className="text-xs text-orange-600">{wh.failureCount} failures</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wh.events.map(ev => <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>)}
                      </div>
                      {wh.lastDeliveredAt && <p className="text-xs text-muted-foreground mt-1">Last delivered {new Date(wh.lastDeliveredAt).toLocaleString()}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => testWebhookMutation.mutate(wh.id)}>Test</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteWebhookMutation.mutate(wh.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* API DOCS */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Public v1 API Reference</CardTitle><CardDescription>Base URL: your-domain.com</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { method: "POST", path: "/v1/crisis/report", desc: "Submit a crisis report", auth: "API Key", body: `{"message":"Accident on highway","location":"NH-44 km 120","type":"road_accident","severity":"high"}` },
                  { method: "GET",  path: "/v1/crisis/alerts?limit=20", desc: "Fetch recent crisis alerts", auth: "API Key", body: null },
                  { method: "GET",  path: "/v1/crisis/:id", desc: "Get incident details by ID", auth: "API Key", body: null },
                ].map(ep => (
                  <div key={ep.path} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={ep.method === "POST" ? "bg-green-600" : "bg-blue-600"}>{ep.method}</Badge>
                      <code className="text-sm font-mono">{ep.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{ep.desc}</p>
                    <p className="text-xs text-muted-foreground">Auth: <code className="bg-muted px-1 rounded">Authorization: Bearer {"<"}API_KEY{">"}</code></p>
                    {ep.body && <pre className="bg-muted rounded p-2 text-xs overflow-x-auto">{ep.body}</pre>}
                  </div>
                ))}
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <p className="text-sm font-semibold">Rate Limits</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center"><p className="font-medium">Free</p><p className="text-muted-foreground">100 req/day</p></div>
                    <div className="text-center"><p className="font-medium">Paid</p><p className="text-muted-foreground">10,000 req/day</p></div>
                    <div className="text-center"><p className="font-medium">Enterprise</p><p className="text-muted-foreground">1M req/day</p></div>
                  </div>
                </div>
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <p className="text-sm font-semibold">Webhook Signature Verification</p>
                  <pre className="text-xs bg-muted rounded p-2">{`// Verify X-CrisisConnect-Signature header
const sig = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');
if ('sha256=' + sig !== header) throw new Error('Invalid signature');`}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
