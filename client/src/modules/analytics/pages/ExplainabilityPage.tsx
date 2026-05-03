/**
 * ExplainabilityPage — AI Decision Intelligence Dashboard.
 *
 * Upgraded to use the new AIExplainabilityPanel component system.
 * Left: paginated decision list with confidence + priority badges.
 * Right: full AIExplainabilityPanel for the selected decision.
 *
 * Visual style: Bloomberg/Datadog dark intelligence tool.
 */
import { useState } from "react";
import { useQuery }  from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Eye, Clock, Shield, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIExplainabilityPanel } from "@/components/ai";

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e",
};

interface Decision {
  reportId:          string;
  title:             string;
  type:              string;
  severity:          string;
  location:          string;
  createdAt:         string;
  auditId:           string;
  confidence:        number;
  fusedPriority:     string;
  finalScore:        number;
  triggered:         boolean;
  urgencyLevel:      string;
  isSuspicious:      boolean;
  isGenuineEmergency:boolean;
}

interface DecisionsResponse {
  decisions: Decision[];
  total:     number;
  page:      number;
  limit:     number;
}

export default function ExplainabilityPage() {
  const [, setLocation]  = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: decisionsData, isLoading } = useQuery<DecisionsResponse>({
    queryKey: ["/api/ai/decisions", page],
    queryFn: () => apiRequest(`/api/ai/decisions?page=${page}&limit=20`),
  });

  const decisions = decisionsData?.decisions ?? [];
  const selected  = decisions.find(d => d.reportId === selectedId);

  return (
    <div className="min-h-full bg-slate-950 text-slate-100" style={{ colorScheme: "dark" }}>
      <div className="p-6 max-w-screen-xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 uppercase tracking-wide">AI Decision Intelligence</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Signal fusion · Contributing factors · Decision reasoning · Audit trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {decisionsData?.total ?? 0} decisions logged
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Decision list (left) ── */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent AI Decisions</span>
              <span className="text-[10px] text-slate-600">Page {page}</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : decisions.length === 0 ? (
              <Alert className="border-slate-800 bg-slate-900">
                <AlertDescription className="text-slate-400 text-xs">
                  No AI decisions recorded yet. Submit a report to generate decisions.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-1.5">
                {decisions.map((d, i) => {
                  const isSelected = selectedId === d.reportId;
                  const pct = Math.round(d.confidence * 100);
                  return (
                    <motion.button
                      key={d.reportId}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedId(d.reportId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all group ${
                        isSelected
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{d.title}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{d.location}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: PRIORITY_COLOR[d.fusedPriority] ?? "#64748b" }} />
                          <span className="text-[10px] font-black"
                            style={{ color: PRIORITY_COLOR[d.fusedPriority] ?? "#94a3b8" }}>
                            {d.fusedPriority}
                          </span>
                        </div>
                      </div>

                      {/* Confidence bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 tabular-nums w-8">{pct}%</span>
                        {d.isSuspicious && (
                          <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        )}
                        {d.triggered && (
                          <Shield className="w-3 h-3 text-orange-500 flex-shrink-0" />
                        )}
                        <ChevronRight className={`w-3 h-3 text-slate-600 transition-colors ${isSelected ? "text-red-500" : "group-hover:text-slate-400"}`} />
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-slate-600 font-mono">{d.auditId.slice(0, 18)}…</span>
                        <span className="text-[9px] text-slate-700">·</span>
                        <span className="text-[9px] text-slate-600 capitalize">{d.type.replace(/_/g, " ")}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </Button>
              <Button size="sm" variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 h-7 text-xs"
                disabled={(decisionsData?.total ?? 0) <= page * 20} onClick={() => setPage(p => p + 1)}>
                Next →
              </Button>
            </div>
          </div>

          {/* ── Explainability panel (right) ── */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {!selectedId ? (
                <motion.div key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-72 rounded-2xl border-2 border-dashed border-slate-800 text-slate-600">
                  <Eye className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-semibold text-sm">Select a decision</p>
                  <p className="text-xs mt-1 text-slate-700">Click any entry to inspect the AI reasoning</p>
                </motion.div>
              ) : (
                <motion.div key={selectedId}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Report link */}
                  {selected && (
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <p className="text-xs font-bold text-slate-300">{selected.title}</p>
                        <p className="text-[10px] text-slate-500">{selected.location}</p>
                      </div>
                      <Button size="sm" variant="ghost"
                        className="h-7 text-xs text-slate-400 hover:text-slate-200 border border-slate-800"
                        onClick={() => setLocation(`/reports/${selectedId}`)}>
                        View Report →
                      </Button>
                    </div>
                  )}

                  {/* ← The plug-and-play component. All visualizations live here. */}
                  <AIExplainabilityPanel
                    reportId={selectedId}
                    createdAt={selected?.createdAt ?? new Date().toISOString()}
                    compact={false}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
