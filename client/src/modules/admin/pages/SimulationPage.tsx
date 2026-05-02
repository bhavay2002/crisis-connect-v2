import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Zap, Play, BarChart3, AlertTriangle, CheckCircle, Activity, Clock, Target, Radio, TrendingUp } from "lucide-react";

interface ScenarioMeta { label: string; icon: string; description: string; defaultIntensity: string }
interface SimRun {
  id: string; scenario: string; location: string; intensity: string;
  eventCount: number; status: string; metricsData: any; startedAt: string; completedAt?: string;
}

const LOCATIONS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore"];
const INTENSITIES = [
  { value: "low",     label: "Low",     color: "text-green-600",  bg: "bg-green-50 border-green-200 dark:bg-green-950",    ring: "ring-green-500"  },
  { value: "medium",  label: "Medium",  color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950", ring: "ring-yellow-500" },
  { value: "high",    label: "High",    color: "text-orange-600", bg: "bg-orange-50 border-orange-200 dark:bg-orange-950", ring: "ring-orange-500" },
  { value: "extreme", label: "Extreme", color: "text-red-600",    bg: "bg-red-50 border-red-200 dark:bg-red-950",          ring: "ring-red-500"    },
];
const STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  pending:   { cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",   dot: "bg-slate-400" },
  running:   { cls: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",        dot: "bg-blue-500 animate-pulse" },
  completed: { cls: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",    dot: "bg-green-500" },
  failed:    { cls: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",            dot: "bg-red-500" },
};

export default function SimulationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scenario, setScenario] = useState("flood");
  const [location, setLocation] = useState("Mumbai");
  const [intensity, setIntensity] = useState("medium");
  const [eventCount, setEventCount] = useState(6);

  const { data: scenariosData } = useQuery<{ scenarios: Record<string, ScenarioMeta> }>({ queryKey: ["/api/simulation/scenarios"] });
  const { data: runsData } = useQuery<{ runs: SimRun[] }>({ queryKey: ["/api/simulation/runs"], refetchInterval: 5000 });

  const runMutation = useMutation({
    mutationFn: () => apiRequest("/api/simulation/run", { method: "POST", body: JSON.stringify({ scenario, location, intensity, eventCount }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/simulation/runs"] });
      toast({ title: `Simulation complete — ${data.eventCount} events injected into live system` });
    },
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const scenarios = scenariosData?.scenarios || {};
  const runs = runsData?.runs || [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-black">Crisis Simulation Engine</h1>
            </div>
            <p className="text-muted-foreground text-sm">Inject synthetic crisis events into the live system to stress-test response pipelines</p>
          </div>
          <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950">§17.2</Badge>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Live injection:</strong> Simulations create real [SIM]-tagged disaster reports and SOS alerts that appear across all dashboards and trigger WebSocket events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config panel */}
          <div className="rounded-2xl border bg-background p-6 space-y-6">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Configure Simulation</h2>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Scenario</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(scenarios).map(([key, meta]) => (
                  <button key={key} onClick={() => setScenario(key)}
                    className={`text-left p-3 rounded-xl border text-sm transition-all ${scenario === key ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-500" : "border-border hover:border-blue-300 bg-muted/30"}`}>
                    <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                      <span>{meta.icon}</span>{meta.label}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{meta.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Intensity</Label>
              <div className="grid grid-cols-4 gap-2">
                {INTENSITIES.map(({ value, label, color, bg, ring }) => (
                  <button key={value} onClick={() => setIntensity(value)}
                    className={`py-2 rounded-xl border text-sm font-semibold transition-all ${intensity === value ? `${bg} ring-1 ${ring} ${color}` : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events to inject</Label>
                <span className="text-lg font-black">{eventCount}</span>
              </div>
              <Slider min={2} max={20} step={1} value={[eventCount]} onValueChange={v => setEventCount(v[0])} className="my-1" />
              <p className="text-xs text-muted-foreground mt-1">Each event = 1 disaster report + possible SOS alert injected into live DB</p>
            </div>

            <Button className="w-full h-11 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold" size="lg" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
              {runMutation.isPending
                ? <><Activity className="w-4 h-4 mr-2 animate-spin" />Injecting {eventCount} events…</>
                : <><Play className="w-4 h-4 mr-2" />Run Simulation</>}
            </Button>
          </div>

          {/* Latest metrics */}
          <div className="rounded-2xl border bg-background p-6">
            <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-4">Latest Run Metrics</h2>
            {runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No simulations run yet</p>
                <p className="text-xs mt-1">Run your first simulation to see metrics</p>
              </div>
            ) : (() => {
              const latest = runs[0];
              const m = latest.metricsData;
              const sc = STATUS_CFG[latest.status] || STATUS_CFG.pending;
              if (!m) return (
                <div className="flex flex-col items-center justify-center h-48">
                  <Activity className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Simulation running…</p>
                </div>
              );
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{latest.status}
                    </span>
                    <span className="font-semibold text-sm capitalize">{latest.scenario.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground text-sm">— {latest.location}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Events Injected",  value: m.totalEventsInjected,   icon: Radio    },
                      { label: "Reports Created",   value: m.reportsCreated,        icon: AlertTriangle },
                      { label: "SOS Alerts",        value: m.sosAlertsCreated,      icon: Zap      },
                      { label: "Est. Affected",     value: m.estimatedAffected?.toLocaleString(), icon: Target },
                      { label: "Response Time",     value: `${m.responseTimeSimMs}ms`, icon: Clock },
                      { label: "Failure Rate",      value: `${(m.failureRate * 100).toFixed(1)}%`, icon: TrendingUp },
                      { label: "Queue Backlog",     value: m.queueBacklog,          icon: Activity },
                      { label: "Scenario Score",    value: m.scenarioScore ? `${m.scenarioScore}/100` : "—", icon: BarChart3 },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="p-3 rounded-xl bg-muted/50 border">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-3 h-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{label}</p>
                        </div>
                        <p className="font-black text-base">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Run history */}
        <div className="rounded-2xl border bg-background p-6">
          <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-4">Run History</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No runs yet</p>
          ) : (
            <div className="space-y-2">
              {runs.map(run => {
                const sc = STATUS_CFG[run.status] || STATUS_CFG.pending;
                return (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{run.status}
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize">{run.scenario.replace(/_/g, " ")} — {run.location}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.startedAt).toLocaleString()} · {run.eventCount} events · {run.intensity}
                          {run.metricsData?.scenarioScore ? ` · score: ${run.metricsData.scenarioScore}/100` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground capitalize border px-2 py-0.5 rounded-lg">{run.intensity}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
