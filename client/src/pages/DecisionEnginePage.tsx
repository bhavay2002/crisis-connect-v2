import { useState } from "react";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Zap, Network, Clock, Activity, ChevronRight,
  BarChart3, Shield, Radio, AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DecisionFeed } from "@/components/decisions/DecisionFeed";
import { TimeToActionPanel } from "@/components/decisions/TimeToActionPanel";
import { IncidentGraph } from "@/components/decisions/IncidentGraph";

const TYPE_ICONS = {
  DISPATCH: { icon: Zap, color: "text-red-400", bg: "bg-red-500/10" },
  ESCALATE: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
  BROADCAST: { icon: Radio, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  PREDEPLOY: { icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
};

function HeaderBanner() {
  const { data } = useQuery({ queryKey: ["/api/decisions/stats"], refetchInterval: 15_000 });
  const stats = data as any;
  const pending = stats?.pending ?? 0;
  const critical = pending > 0;

  return (
    <motion.div
      {...MOTION.fadeUp}
      className={cn(
        "rounded-2xl border p-5 mb-6",
        critical
          ? "bg-red-950/30 border-red-500/30"
          : "bg-slate-900 border-slate-800"
      )}
    >
      <div className="flex items-start gap-4">
        <motion.div
          className={cn(
            "p-3 rounded-xl",
            critical ? "bg-red-500/20" : "bg-slate-800"
          )}
          animate={critical ? { scale: [1, 1.08, 1], opacity: [1, 0.8, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.4 }}
        >
          <Brain className={cn("w-6 h-6", critical ? "text-red-400" : "text-slate-400")} />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black text-white tracking-tight">Decision Engine</h1>
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
              critical ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-slate-800 text-slate-400"
            )}>
              {critical ? `${pending} PENDING` : "OPERATIONAL"}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            AI-generated operational decisions from fused signal analysis. Approve, reject, or let critical decisions auto-execute.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
          <Activity className="w-3.5 h-3.5" />
          <span>Live</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: BarChart3, color: "text-slate-300" },
          { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-yellow-400" },
          { label: "Executed", value: stats?.executed ?? 0, icon: Zap, color: "text-green-400" },
          { label: "Confidence", value: `${stats?.avgConfidence ?? 0}%`, icon: Brain, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center gap-2.5">
            <s.icon className={cn("w-4 h-4 shrink-0", s.color)} />
            <div>
              <motion.p
                key={String(s.value)}
                className={cn("text-lg font-black tabular-nums leading-none", s.color)}
                {...MOTION.springPop}
              >
                {s.value}
              </motion.p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function FlowDiagram() {
  const steps = [
    { label: "User Report", color: "bg-slate-700 text-slate-300" },
    { label: "AI Analysis", color: "bg-blue-900/60 text-blue-300" },
    { label: "Signal Fusion", color: "bg-purple-900/60 text-purple-300" },
    { label: "Decision Engine", color: "bg-red-900/60 text-red-300", highlight: true },
    { label: "Action Executor", color: "bg-green-900/60 text-green-300" },
  ];

  return (
    <motion.div
      {...MOTION.fadeIn}
      className="rounded-xl bg-slate-900 border border-slate-800 p-4 mb-6"
    >
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">System Flow</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold border",
              s.color,
              s.highlight ? "border-red-500/40 ring-1 ring-red-500/20" : "border-transparent"
            )}>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600 mt-3">
        AI → Signal Fusion → <span className="text-red-400 font-medium">Decision Engine</span> → Action → Outcome
      </p>
    </motion.div>
  );
}

export default function DecisionEnginePage() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();

  const { data: activeData } = useQuery({
    queryKey: ["/api/decisions/active"],
    refetchInterval: 15_000,
  });

  const latestIncidentId = (activeData as any)?.decisions?.[0]?.incidentId;

  const graphTarget = selectedIncidentId ?? latestIncidentId;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <HeaderBanner />
      <FlowDiagram />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">AI Decisions</h2>
            <span className="ml-auto text-xs text-slate-500">Click to expand · approve or reject</span>
          </div>
          <DecisionFeed />
        </div>

        <div className="xl:col-span-2">
          <Tabs defaultValue="metrics">
            <TabsList className="bg-slate-900 border border-slate-800 mb-4 w-full">
              <TabsTrigger value="metrics" className="flex-1 data-[state=active]:bg-slate-800 text-xs">
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Response Efficiency
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex-1 data-[state=active]:bg-slate-800 text-xs">
                <Network className="w-3.5 h-3.5 mr-1.5" /> Incident Graph
              </TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="mt-0">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <TimeToActionPanel />
              </div>
            </TabsContent>

            <TabsContent value="graph" className="mt-0">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-slate-200">Incident Relationship Graph</h2>
                  {graphTarget && (
                    <span className="ml-auto text-xs text-slate-500 font-mono">
                      {graphTarget.slice(0, 8)}…
                    </span>
                  )}
                </div>
                <IncidentGraph reportId={graphTarget} />
                {!graphTarget && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Showing latest active incident graph automatically
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
