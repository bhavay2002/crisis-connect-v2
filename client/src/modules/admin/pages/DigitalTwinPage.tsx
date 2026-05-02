import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Globe, Zap, AlertTriangle, GitBranch, MapPin, Building2, Users, Navigation } from "lucide-react";

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
  hospital:     "border-red-200 bg-red-50 dark:bg-red-950/30",
  fire_station: "border-orange-200 bg-orange-50 dark:bg-orange-950/30",
  police:       "border-blue-200 bg-blue-50 dark:bg-blue-950/30",
  shelter:      "border-green-200 bg-green-50 dark:bg-green-950/30",
  road_junction:"border-slate-200 bg-slate-50 dark:bg-slate-800/30",
  bridge:       "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30",
  zone:         "border-purple-200 bg-purple-50 dark:bg-purple-950/30",
  landmark:     "border-pink-200 bg-pink-50 dark:bg-pink-950/30",
};
const RISK_SPREAD_COLORS: Record<string, string> = {
  contained:   "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  moderate:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  severe:      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  catastrophic:"bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
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

  const { data: modelData } = useQuery<{ cityId: string; nodes: CityNode[]; edges: any[]; nodeCount: number; edgeCount: number }>({
    queryKey: ["/api/digital-twin/model"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("/api/digital-twin/seed", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/digital-twin/model"] }); toast({ title: "City model seeded — 15 nodes, 15 edges (Mumbai-inspired)" }); },
    onError: (e: any) => toast({ title: e?.message || "Seed failed", variant: "destructive" }),
  });

  const simulateMutation = useMutation({
    mutationFn: () => apiRequest("/api/digital-twin/simulate", { method: "POST", body: JSON.stringify({ crisisNodeId: selectedNode, crisisType, severity }) }),
    onSuccess: (data: any) => { setSimResult(data); toast({ title: `Propagation simulated — ${data.affectedNodes?.length} nodes affected` }); },
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const nodes = modelData?.nodes || [];
  const selectedNodeName = nodes.find(n => n.id === selectedNode)?.name;

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-teal-500" />
              </div>
              <h1 className="text-2xl font-black">Digital Twin — City Model</h1>
            </div>
            <p className="text-sm text-muted-foreground">BFS graph propagation across city nodes — predict spread, bottlenecks, responder travel time</p>
          </div>
          {nodes.length > 0 && (
            <div className="flex gap-3">
              {[
                { label: "Nodes", value: modelData?.nodeCount, icon: MapPin },
                { label: "Edges", value: modelData?.edgeCount, icon: GitBranch },
                { label: "Responders", value: nodes.filter(n => ["hospital","fire_station","police"].includes(n.type)).length, icon: Building2 },
                { label: "High Risk", value: nodes.filter(n => n.riskScore >= 60).length, icon: AlertTriangle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center px-3 py-2 rounded-xl border bg-background">
                  <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-black">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {nodes.length === 0 ? (
          <div className="rounded-2xl border bg-background p-16 text-center">
            <Globe className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="font-bold text-lg mb-1">No city model found</p>
            <p className="text-sm text-muted-foreground mb-6">Seed the default Mumbai-inspired model to begin simulations</p>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? "Seeding…" : "🌆 Seed Default City Model (15 nodes)"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Node map */}
            <div className="lg:col-span-2 rounded-2xl border bg-background p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm">City Nodes — Click to select crisis origin</h2>
                {selectedNodeName && (
                  <span className="text-xs text-teal-700 bg-teal-50 border border-teal-200 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full font-medium">
                    📍 {selectedNodeName}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {nodes.map(n => (
                  <button key={n.id} onClick={() => setSelectedNode(n.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all text-sm ${selectedNode === n.id ? "ring-2 ring-teal-500 border-teal-400 bg-teal-50 dark:bg-teal-950/30" : `${NODE_COLORS[n.type] || "border-border"} hover:opacity-80`}`}>
                    <div className="flex items-center gap-1.5 font-semibold mb-1">
                      <span>{NODE_ICONS[n.type] || "📍"}</span>
                      <span className="truncate text-xs">{n.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground capitalize">{n.type.replace(/_/g, " ")}</span>
                      <span className={`text-xs font-bold ${n.riskScore >= 60 ? "text-red-600" : n.riskScore >= 30 ? "text-yellow-600" : "text-green-600"}`}>
                        {n.riskScore}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation panel */}
            <div className="space-y-4">
              <div className="rounded-2xl border bg-background p-5 shadow-sm">
                <h2 className="font-bold text-sm mb-4">Run Propagation</h2>

                <div className="space-y-3 mb-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Origin Node</Label>
                    <Select value={selectedNode} onValueChange={setSelectedNode}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select a node…" /></SelectTrigger>
                      <SelectContent>{nodes.map(n => <SelectItem key={n.id} value={n.id}>{NODE_ICONS[n.type]} {n.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Crisis Type</Label>
                    <Select value={crisisType} onValueChange={setCrisisType}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Severity</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SEVERITY_OPTS.map(s => (
                        <button key={s} onClick={() => setSeverity(s)}
                          className={`py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${severity === s ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => simulateMutation.mutate()} disabled={!selectedNode || simulateMutation.isPending}>
                  {simulateMutation.isPending ? "Propagating…" : <><Zap className="w-4 h-4 mr-2" />Simulate Propagation</>}
                </Button>
              </div>

              {/* Propagation result */}
              {simResult && (
                <div className="rounded-2xl border bg-background p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Propagation Result</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${RISK_SPREAD_COLORS[simResult.riskSpread]}`}>{simResult.riskSpread}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Response Time", value: simResult.predictedResponseTime },
                      { label: "Nodes Affected", value: simResult.affectedNodes.length },
                      { label: "Est. Population", value: simResult.estimatedAffectedPopulation.toLocaleString() },
                      { label: "Confidence", value: `${(simResult.confidenceScore * 100).toFixed(0)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-bold text-sm mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {simResult.bottlenecks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bottlenecks</p>
                      <div className="flex flex-wrap gap-1">
                        {simResult.bottlenecks.map(b => (
                          <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nearest Responders</p>
                    {simResult.nearestResponders.slice(0, 3).map(r => (
                      <div key={r.id} className="flex justify-between items-center text-xs py-1.5 border-b last:border-0">
                        <span className="font-medium">{NODE_ICONS[r.type]} {r.name}</span>
                        <span className={`font-bold ${r.availability === "available" ? "text-green-600" : r.availability === "limited" ? "text-yellow-600" : "text-red-600"}`}>
                          {r.travelTimeMinutes}min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}
