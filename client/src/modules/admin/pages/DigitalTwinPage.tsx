import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Globe, Zap, AlertTriangle, Clock, Users, GitBranch, MapPin, Building2 } from "lucide-react";

interface CityNode { id: string; name: string; type: string; latitude: string; longitude: string; riskScore: number; capacity?: number }
interface PropResult {
  affectedNodes: any[]; nearestResponders: any[]; predictedResponseTime: string;
  riskSpread: string; bottlenecks: string[]; estimatedAffectedPopulation: number; confidenceScore: number;
}

const NODE_ICONS: Record<string, string> = {
  hospital: "🏥", fire_station: "🚒", police: "👮", shelter: "🏕️",
  road_junction: "🔀", bridge: "🌉", zone: "🏙️", landmark: "📍",
};

const NODE_COLORS: Record<string, string> = {
  hospital: "bg-red-100 text-red-700 border-red-200",
  fire_station: "bg-orange-100 text-orange-700 border-orange-200",
  police: "bg-blue-100 text-blue-700 border-blue-200",
  shelter: "bg-green-100 text-green-700 border-green-200",
  road_junction: "bg-gray-100 text-gray-700 border-gray-200",
  bridge: "bg-yellow-100 text-yellow-700 border-yellow-200",
  zone: "bg-purple-100 text-purple-700 border-purple-200",
  landmark: "bg-pink-100 text-pink-700 border-pink-200",
};

const RISK_SPREAD_COLORS: Record<string, string> = {
  contained: "bg-green-100 text-green-700", moderate: "bg-yellow-100 text-yellow-700",
  severe: "bg-orange-100 text-orange-700", catastrophic: "bg-red-100 text-red-700",
};

const SEVERITY_OPTS = ["low", "medium", "high", "critical"];
const CRISIS_TYPES = ["flood", "earthquake", "fire", "storm", "building_collapse", "gas_leak"];

export default function DigitalTwinPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [severity, setSeverity] = useState("high");
  const [crisisType, setCrisisType] = useState("flood");
  const [simResult, setSimResult] = useState<PropResult | null>(null);

  const { data: modelData, refetch: refetchModel } = useQuery<{ cityId: string; nodes: CityNode[]; edges: any[]; nodeCount: number; edgeCount: number }>({
    queryKey: ["/api/digital-twin/model"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("/api/digital-twin/seed", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/digital-twin/model"] }); toast({ title: "City model seeded — 15 nodes, 15 edges (Mumbai-inspired)" }); },
    onError: (e: any) => toast({ title: e?.message || "Seed failed", variant: "destructive" }),
  });

  const simulateMutation = useMutation({
    mutationFn: () => apiRequest("/api/digital-twin/simulate", {
      method: "POST",
      body: JSON.stringify({ crisisNodeId: selectedNode, crisisType, severity }),
    }),
    onSuccess: (data: any) => { setSimResult(data); toast({ title: `Propagation simulated — ${data.affectedNodes?.length} nodes affected` }); },
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const nodes = modelData?.nodes || [];
  const edges = modelData?.edges || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="w-8 h-8 text-teal-600" />
            Digital Twin — City Model
          </h1>
          <p className="text-muted-foreground mt-1">
            Virtual city graph for crisis propagation simulation, responder routing, and bottleneck detection
          </p>
        </div>

        {/* City model overview */}
        {nodes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold mb-1">No city model found</p>
              <p className="text-sm text-muted-foreground mb-4">Seed the default Mumbai-inspired model to begin simulations</p>
              <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? "Seeding..." : "Seed Default City Model"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Nodes", value: modelData?.nodeCount, icon: MapPin },
                { label: "Edges", value: modelData?.edgeCount, icon: GitBranch },
                { label: "High-Risk Nodes", value: nodes.filter(n => n.riskScore >= 60).length, icon: AlertTriangle },
                { label: "Responders", value: nodes.filter(n => ["hospital","fire_station","police"].includes(n.type)).length, icon: Building2 },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}><CardContent className="pt-3 pb-3">
                  <div className="flex justify-between items-start">
                    <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
                    <Icon className="w-5 h-5 text-muted-foreground opacity-50" />
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Node grid */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader><CardTitle>City Nodes</CardTitle><CardDescription>Click a node to select it as the crisis origin</CardDescription></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {nodes.map(n => (
                        <button key={n.id} onClick={() => setSelectedNode(n.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all text-sm ${selectedNode === n.id ? "ring-2 ring-blue-500 border-blue-300" : `${NODE_COLORS[n.type]} hover:opacity-80`}`}>
                          <div className="flex items-center gap-1.5 font-medium mb-1">
                            <span>{NODE_ICONS[n.type]}</span>
                            <span className="truncate">{n.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs opacity-70 capitalize">{n.type.replace(/_/g, " ")}</span>
                            <span className={`text-xs font-semibold ${n.riskScore >= 60 ? "text-red-600" : n.riskScore >= 30 ? "text-yellow-600" : "text-green-600"}`}>
                              Risk: {n.riskScore}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Simulation panel */}
              <Card>
                <CardHeader><CardTitle>Run Propagation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Origin Node</Label>
                    <Select value={selectedNode} onValueChange={setSelectedNode}>
                      <SelectTrigger><SelectValue placeholder="Select a node…" /></SelectTrigger>
                      <SelectContent>{nodes.map(n => <SelectItem key={n.id} value={n.id}>{NODE_ICONS[n.type]} {n.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Crisis Type</Label>
                    <Select value={crisisType} onValueChange={setCrisisType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {SEVERITY_OPTS.map(s => (
                        <button key={s} onClick={() => setSeverity(s)}
                          className={`py-1 rounded border text-xs font-medium capitalize transition-colors ${severity === s ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => simulateMutation.mutate()} disabled={!selectedNode || simulateMutation.isPending}>
                    {simulateMutation.isPending ? "Propagating..." : <><Zap className="w-4 h-4 mr-2" />Simulate Propagation</>}
                  </Button>

                  {/* Propagation result */}
                  {simResult && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Propagation Result</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_SPREAD_COLORS[simResult.riskSpread]}`}>{simResult.riskSpread}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Response Time</p><p className="font-bold text-xs">{simResult.predictedResponseTime}</p></div>
                        <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Nodes Affected</p><p className="font-bold">{simResult.affectedNodes.length}</p></div>
                        <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Est. Affected Pop.</p><p className="font-bold">{simResult.estimatedAffectedPopulation.toLocaleString()}</p></div>
                        <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Confidence</p><p className="font-bold">{(simResult.confidenceScore * 100).toFixed(0)}%</p></div>
                      </div>
                      {simResult.bottlenecks.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Bottlenecks</p>
                          {simResult.bottlenecks.map(b => <Badge key={b} variant="destructive" className="text-xs mr-1">{b}</Badge>)}
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Nearest Responders</p>
                        {simResult.nearestResponders.slice(0, 3).map(r => (
                          <div key={r.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                            <span>{NODE_ICONS[r.type]} {r.name}</span>
                            <span className={r.availability === "available" ? "text-green-600" : r.availability === "limited" ? "text-yellow-600" : "text-red-600"}>
                              {r.travelTimeMinutes}min
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
