import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Zap, Play, Clock, BarChart3, AlertTriangle, CheckCircle, Activity } from "lucide-react";

interface ScenarioMeta { label: string; icon: string; description: string; defaultIntensity: string }
interface SimRun {
  id: string; scenario: string; location: string; intensity: string;
  eventCount: number; status: string; metricsData: any; startedAt: string; completedAt?: string;
}

const LOCATIONS = ["Mumbai", "Delhi", "Chennai", "Kolkata", "Bangalore"];
const INTENSITIES: { value: string; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-green-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "extreme", label: "Extreme", color: "text-red-600" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700", running: "bg-blue-100 text-blue-700 animate-pulse",
  completed: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700",
};

export default function SimulationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scenario, setScenario] = useState("flood");
  const [location, setLocation] = useState("Mumbai");
  const [intensity, setIntensity] = useState("medium");
  const [eventCount, setEventCount] = useState(6);

  const { data: scenariosData } = useQuery<{ scenarios: Record<string, ScenarioMeta> }>({ queryKey: ["/api/simulation/scenarios"] });
  const { data: runsData, refetch } = useQuery<{ runs: SimRun[] }>({ queryKey: ["/api/simulation/runs"], refetchInterval: 5000 });

  const runMutation = useMutation({
    mutationFn: () => apiRequest("/api/simulation/run", {
      method: "POST",
      body: JSON.stringify({ scenario, location, intensity, eventCount }),
    }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/simulation/runs"] });
      toast({ title: `Simulation complete — ${data.eventCount} events injected into live system` });
    },
    onError: () => toast({ title: "Simulation failed", variant: "destructive" }),
  });

  const scenarios = scenariosData?.scenarios || {};
  const runs = runsData?.runs || [];
  const currentScenarioMeta = scenarios[scenario];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-600" />
            Crisis Simulation Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Inject synthetic crisis events into the live system to test response, scaling, and decision accuracy
          </p>
        </div>

        <Alert className="border-orange-400 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            <strong>Warning:</strong> Simulations inject real reports and SOS alerts tagged [SIM] into the live database. They appear in all dashboards and fire real WebSocket events.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulation config */}
          <Card>
            <CardHeader><CardTitle>Configure Simulation</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Scenario</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Object.entries(scenarios).map(([key, meta]) => (
                    <button key={key} onClick={() => setScenario(key)}
                      className={`text-left p-2.5 rounded-lg border text-sm transition-colors ${scenario === key ? "border-blue-500 bg-blue-50" : "border-border hover:border-blue-300"}`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{meta.icon}</span>{meta.label}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{meta.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Intensity</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {INTENSITIES.map(({ value, label, color }) => (
                    <button key={value} onClick={() => setIntensity(value)}
                      className={`py-1.5 rounded-md border text-sm font-medium transition-colors ${intensity === value ? "border-blue-500 bg-blue-50" : "border-border"} ${color}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex justify-between">
                  <span>Events to inject</span>
                  <span className="font-bold">{eventCount}</span>
                </Label>
                <Slider className="mt-2" min={2} max={20} step={1} value={[eventCount]} onValueChange={v => setEventCount(v[0])} />
                <p className="text-xs text-muted-foreground mt-1">Each event creates a real disaster report + possible SOS alert</p>
              </div>

              <Button className="w-full" size="lg" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
                {runMutation.isPending ? (
                  <><Activity className="w-4 h-4 mr-2 animate-spin" />Injecting {eventCount} events...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />Run Simulation</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Latest result */}
          <Card>
            <CardHeader><CardTitle>Simulation Metrics</CardTitle><CardDescription>Results from the most recent run</CardDescription></CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No simulations run yet</p>
                </div>
              ) : (() => {
                const latest = runs[0];
                const m = latest.metricsData;
                if (!m) return <div className="text-center py-8 text-muted-foreground"><Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />Running…</div>;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[latest.status]}`}>{latest.status}</span>
                      <span className="text-sm font-medium capitalize">{latest.scenario.replace(/_/g, " ")}</span>
                      <span className="text-sm text-muted-foreground">— {latest.location}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Events Injected",   value: m.totalEventsInjected  },
                        { label: "Reports Created",   value: m.reportsCreated       },
                        { label: "SOS Alerts",        value: m.sosAlertsCreated     },
                        { label: "Est. Affected",     value: m.estimatedAffected?.toLocaleString() },
                        { label: "Response Time",     value: `${m.responseTimeSimMs}ms` },
                        { label: "Failure Rate",      value: `${(m.failureRate * 100).toFixed(1)}%` },
                        { label: "Queue Backlog",     value: m.queueBacklog         },
                        { label: "Scenario Score",    value: `${m.scenarioScore}/100` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-muted/50 rounded p-2">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-bold">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Run history */}
        <Card>
          <CardHeader><CardTitle>Run History</CardTitle></CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No runs yet</p>
            ) : (
              <div className="space-y-2">
                {runs.map(run => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[run.status]}`}>{run.status}</span>
                      <div>
                        <p className="text-sm font-medium capitalize">{run.scenario.replace(/_/g, " ")} — {run.location}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.startedAt).toLocaleString()} · {run.eventCount} events · intensity: {run.intensity}
                          {run.metricsData?.scenarioScore ? ` · score: ${run.metricsData.scenarioScore}/100` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{run.intensity}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
