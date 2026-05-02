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
import { Zap, Play, BarChart3, AlertTriangle, CheckCircle, Activity, Clock, TrendingUp, Users, Target } from "lucide-react";

interface ScenarioMeta { label: string; icon: string; description: string; defaultIntensity: string }
interface SimRun {
  id: string; scenario: string; location: string; intensity: string;
  eventCount: number; status: string; metricsData: any; startedAt: string; completedAt?: string;
}

const LOCATIONS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore"];
const INTENSITIES = [
  { value: "low",     label: "Low",     color: "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300"   },
  { value: "medium",  label: "Medium",  color: "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300" },
  { value: "high",    label: "High",    color: "border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950 dark:text-orange-300" },
  { value: "extreme", label: "Extreme", color: "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300"             },
];
const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-slate-100 text-slate-600",
  running:   "bg-blue-100 text-blue-700 animate-pulse",
  completed: "bg-green-100 text-green-700",
  failed:    "bg-red-100 text-red-700",
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
      toast({ title: `✅ Simulation complete — ${data.eventCount} events injected into live system` });
    },
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const scenarios = scenariosData?.scenarios || {};
  const runs = runsData?.runs || [];
  const latest = runs[0];
  const m = latest?.metricsData;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-black">Crisis Simulation Engine</h1>
            </div>
            <p className="text-sm text-muted-foreground">Inject synthetic events into the live system to stress-test response pipelines</p>
          </div>
          <div className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300 font-medium">
            ⚠ Writes to live DB
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Config panel */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h2 className="font-bold text-sm mb-4">Configure Simulation</h2>

              {/* Scenario grid */}
              <div className="mb-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Scenario</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(scenarios).map(([key, meta]) => (
                    <button key={key} onClick={() => setScenario(key)}
                      className={`text-left p-2.5 rounded-xl border text-sm transition-all ${scenario === key ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30" : "border-border hover:border-yellow-300 hover:bg-muted/50"}`}>
                      <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                        <span>{meta.icon}</span>
                        <span className="truncate">{meta.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{meta.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="mb-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Intensity */}
              <div className="mb-4">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Intensity</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {INTENSITIES.map(({ value, label, color }) => (
                    <button key={value} onClick={() => setIntensity(value)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${intensity === value ? color + " ring-1 ring-inset ring-current" : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event count */}
              <div className="mb-5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex justify-between">
                  <span>Events to inject</span>
                  <span className="font-black text-foreground">{eventCount}</span>
                </Label>
                <Slider min={2} max={20} step={1} value={[eventCount]} onValueChange={v => setEventCount(v[0])} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1.5">Each creates a real report + possible SOS alert</p>
              </div>

              <Button className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-white font-bold" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
                {runMutation.isPending ? (
                  <><Activity className="w-4 h-4 mr-2 animate-spin" />Injecting {eventCount} events…</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />Run Simulation</>
                )}
              </Button>
            </div>
          </div>

          {/* Metrics panel */}
          <div className="lg:col-span-3 space-y-4">
            {/* Latest result metrics */}
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Latest Simulation Metrics
              </h2>
              {!latest ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Zap className="w-10 h-10 mb-3 opacity-20" />
                  <p className="font-medium">No simulations run yet</p>
                  <p className="text-xs mt-1">Configure and run your first simulation</p>
                </div>
              ) : !m ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <Activity className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-sm font-medium">Simulation running…</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 mb-4 pb-4 border-b">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[latest.status]}`}>{latest.status}</span>
                    <span className="text-sm font-semibold capitalize">{latest.scenario.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">— {latest.location} — {latest.intensity} intensity</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Events Injected",  value: m.totalEventsInjected,                       icon: Zap,       color: "text-yellow-500", bg: "bg-yellow-500/10" },
                      { label: "Reports Created",   value: m.reportsCreated,                            icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10"  },
                      { label: "SOS Alerts",        value: m.sosAlertsCreated,                          icon: Activity,  color: "text-orange-500", bg: "bg-orange-500/10"},
                      { label: "Est. Affected",     value: m.estimatedAffected?.toLocaleString(),       icon: Users,     color: "text-blue-500",   bg: "bg-blue-500/10"  },
                      { label: "Response Time",     value: `${m.responseTimeSimMs}ms`,                  icon: Clock,     color: "text-cyan-500",   bg: "bg-cyan-500/10"  },
                      { label: "Failure Rate",      value: `${(m.failureRate * 100).toFixed(1)}%`,      icon: Target,    color: "text-purple-500", bg: "bg-purple-500/10"},
                      { label: "Queue Backlog",     value: m.queueBacklog,                              icon: BarChart3, color: "text-slate-500",  bg: "bg-slate-500/10" },
                      { label: "Scenario Score",    value: `${m.scenarioScore}/100`,                    icon: TrendingUp,color: "text-green-500",  bg: "bg-green-500/10" },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                      <div key={label} className={`rounded-xl p-3 border`}>
                        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                        </div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-black text-sm mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Run history */}
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <h2 className="font-bold text-sm mb-3">Run History</h2>
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No runs yet</p>
              ) : (
                <div className="space-y-2">
                  {runs.map(run => (
                    <div key={run.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[run.status]}`}>{run.status}</span>
                        <div>
                          <p className="text-sm font-semibold capitalize">{run.scenario.replace(/_/g, " ")} — {run.location}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(run.startedAt).toLocaleString()} · {run.eventCount} events
                            {run.metricsData?.scenarioScore ? ` · score ${run.metricsData.scenarioScore}/100` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
                        run.intensity === "extreme" ? "border-red-500 text-red-600" :
                        run.intensity === "high" ? "border-orange-500 text-orange-600" :
                        run.intensity === "medium" ? "border-yellow-500 text-yellow-600" :
                        "border-green-500 text-green-600"
                      }`}>{run.intensity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
