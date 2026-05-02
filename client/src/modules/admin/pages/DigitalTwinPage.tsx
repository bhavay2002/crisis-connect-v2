import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Globe, Zap, AlertTriangle, MapPin, Building2, GitBranch, Activity, Users, Shield } from "lucide-react";

interface CityNode { id: string; name: string; type: string; latitude: string; longitude: string; riskScore: number; capacity?: number }
interface PropResult {
  affectedNodes: any[]; nearestResponders: any[]; predictedResponseTime: string;
  riskSpread: string; bottlenecks: string[]; estimatedAffectedPopulation: number; confidenceScore: number;
}

const NODE_ICONS: Record<string, string> = {
  hospital: "🏥", fire_station: "🚒", police: "👮", shelter: "🏕️",
  road_junction: "🔀", bridge: "🌉", zone: "🏙️", landmark: "📍",
};
const NODE_CLR: Record<string, { border: string; bg: string; text: string }> = {
  hospital:      { border: "border-red-300",    bg: "bg-red-50 dark:bg-red-950/30",    text: "text-red-700 dark:text-red-400"    },
  fire_station:  { border: "border-orange-300", bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400" },
  police:        { border: "border-blue-300",   bg: "bg-blue-50 dark:bg-blue-950/30",  text: "text-blue-700 dark:text-blue-400"  },
  shelter:       { border: "border-green-300",  bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400" },
  road_junction: { border: "border-slate-300",  bg: "bg-slate-50 dark:bg-slate-800",   text: "text-slate-700 dark:text-slate-400" },
  bridge:        { border: "border-yellow-300", bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-400" },
  zone:          { border: "border-purple-300", bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" },
  landmark:      { border: "border-pink-300",   bg: "bg-pink-50 dark:bg-pink-950/30",  text: "text-pink-700 dark:text-pink-400"  },
};
const SPREAD_CFG: Record<string, string> = {
  contained:    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
  moderate:     "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300",
  severe:       "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  catastrophic: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
};
const SEVERITY_OPTS = ["low","medium","high","critical"];
const CRISIS_TYPES  = ["flood","earthquake","fire","storm","building_collapse","gas_leak"];

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
    onSuccess: (data: any) => { setSimResult(data); toast({ title: `Propagation — ${data.affectedNodes?.length} nodes affected` }); },
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const nodes = modelData?.nodes || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <Globe className="w-5 h-5 text-teal-600" />
              </div>
              <h1 className="text-2xl font-black">Digital Twin — City Model</h1>
            </div>
            <p className="text-sm text-muted-foreground">Virtual city graph for crisis propagation, responder routing, and bottleneck detection</p>
          </div>
          <Badge variant="outline" className="border-teal-300 text-teal-600 bg-teal-50 dark:bg-teal-950">§17.3</Badge>
        </div>

        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed">
            <Globe className="w-14 h-14 mb-4 text-muted-foreground opacity-30" />
            <p className="font-bold text-lg mb-1">No city model found</p>
            <p className="text-sm text-muted-foreground mb-6">Seed the default Mumbai-inspired model (15 nodes · 15 edges) to begin simulations</p>
            <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="bg-teal-600 hover:bg-teal-700 text-white">
              {seedMutation.isPending ? <><Activity className="w-4 h-4 mr-2 animate-spin" />Seeding…</> : <><Globe className="w-4 h-4 mr-2" />Seed Default City Model</>}
            </Button>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Nodes",            value: modelData?.nodeCount, icon: MapPin,      color: "text-teal-600",   bg: "bg-teal-500/10"   },
                { label: "Edges",            value: modelData?.edgeCount, icon: GitBranch,   color: "text-blue-600",   bg: "bg-blue-500/10"   },
                { label: "High-Risk Nodes",  value: nodes.filter(n => n.riskScore >= 60).length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-500/10" },
                { label: "Responder Nodes",  value: nodes.filter(n => ["hospital","fire_station","police"].includes(n.type)).length, icon: Shield, color: "text-green-600", bg: "bg-green-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl border bg-background p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <p className="text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Node grid */}
              <div className="lg:col-span-2 rounded-2xl border bg-background p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">City Nodes</h2>
                  <p className="text-xs text-muted-foreground">Click a node to set as crisis origin</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {nodes.map(n => {
                    const clr = NODE_CLR[n.type] || NODE_CLR.landmark;
                    return (
                      <button key={n.id} onClick={() => setSelectedNode(n.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${selectedNode === n.id ? "ring-2 ring-teal-500 border-teal-400" : `${clr.border} ${clr.bg} hover:opacity-80`}`}>
                        <div className={`flex items-center gap-1.5 font-semibold text-sm mb-1 ${clr.text}`}>
                          <span>{NODE_ICONS[n.type]}</span>
                          <span className="truncate">{n.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-60 capitalize">{n.type.replace(/_/g, " ")}</span>
                          <span className={`text-xs font-bold ${n.riskScore >= 60 ? "text-red-600" : n.riskScore >= 30 ? "text-yellow-600" : "text-green-600"}`}>
                            {n.riskScore}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulation panel */}
              <div className="rounded-2xl border bg-background p-6 space-y-4">
                <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Run Propagation</h2>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Origin Node</Label>
                  <Select value={selectedNode} onValueChange={setSelectedNode}>
                    <SelectTrigger><SelectValue placeholder="Select a node…" /></SelectTrigger>
                    <SelectContent>{nodes.map(n => <SelectItem key={n.id} value={n.id}>{NODE_ICONS[n.type]} {n.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Crisis Type</Label>
                  <Select value={crisisType} onValueChange={setCrisisType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CRISIS_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Severity</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SEVERITY_OPTS.map(s => (
                      <button key={s} onClick={() => setSeverity(s)}
                        className={`py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${severity === s ? "border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500" : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => simulateMutation.mutate()} disabled={!selectedNode || simulateMutation.isPending}>
                  {simulateMutation.isPending ? <><Activity className="w-4 h-4 mr-2 animate-spin" />Propagating…</> : <><Zap className="w-4 h-4 mr-2" />Simulate Propagation</>}
                </Button>

                {simResult && (
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">Result</p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${SPREAD_CFG[simResult.riskSpread]}`}>
                        {simResult.riskSpread}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Response Time",    value: simResult.predictedResponseTime           },
                        { label: "Nodes Affected",   value: simResult.affectedNodes.length            },
                        { label: "Affected Pop.",    value: simResult.estimatedAffectedPopulation.toLocaleString() },
                        { label: "Confidence",       value: `${(simResult.confidenceScore * 100).toFixed(0)}%`    },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-2 rounded-lg bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-black text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                    {simResult.bottlenecks.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">⚠ Bottlenecks</p>
                        <div className="flex flex-wrap gap-1">
                          {simResult.bottlenecks.map(b => (
                            <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300">{b}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Nearest Responders</p>
                      {simResult.nearestResponders.slice(0, 3).map(r => (
                        <div key={r.id} className="flex justify-between text-xs py-1.5 border-b last:border-0">
                          <span>{NODE_ICONS[r.type]} {r.name}</span>
                          <span className={`font-bold ${r.availability === "available" ? "text-green-600" : r.availability === "limited" ? "text-yellow-600" : "text-red-600"}`}>
                            {r.travelTimeMinutes} min
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
