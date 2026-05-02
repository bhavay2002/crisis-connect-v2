import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/queryClient";
import { Brain, BookOpen, Globe, Phone, AlertTriangle, CheckCircle, Loader2, ChevronRight, Zap, Shield } from "lucide-react";

interface CopilotGuidance {
  summary: string;
  immediateActions: string[];
  medicalGuidance: string[];
  evacuationProtocol: string[];
  localResources: { name: string; contact: string; notes: string }[];
  doNots: string[];
  confidence: number;
  language: string;
  governmentGuidelines: string;
  hindiInstructions?: string;
}

const DISASTER_TYPES = [
  "fire", "flood", "earthquake", "storm", "road_accident", "epidemic",
  "landslide", "gas_leak", "building_collapse", "chemical_spill", "other"
];
const SEVERITIES = ["low", "medium", "high", "critical"];
const LANGUAGES = [{ value: "en", label: "🇬🇧 English" }, { value: "hi", label: "🇮🇳 Hindi" }];

const DEMOS = [
  { type: "flood",      severity: "critical", location: "Mumbai, Maharashtra", description: "Streets completely flooded, water level rising rapidly, people stranded on rooftops" },
  { type: "earthquake", severity: "high",     location: "Delhi, NCR",          description: "Strong tremors felt, multiple buildings showing cracks, people evacuating" },
  { type: "fire",       severity: "critical", location: "Bangalore, Karnataka", description: "Massive industrial fire near residential area, thick smoke visible from 5km" },
];

export default function CrisisCopilot() {
  const [form, setForm] = useState({ emergencyType: "fire", severity: "high", description: "", location: "", language: "en" });
  const [guidance, setGuidance] = useState<CopilotGuidance | null>(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => apiRequest<CopilotGuidance>("/api/ai/copilot", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (data) => setGuidance(data),
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-500" />
            </div>
            <h1 className="text-2xl font-black">AI Crisis Copilot</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            RAG-powered emergency guidance — step-by-step protocols, medical guidance, local resources, and Hindi support
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 rounded-2xl border bg-background p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />Describe the Emergency
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Type</Label>
                <Select value={form.emergencyType} onValueChange={v => setForm(f => ({ ...f, emergencyType: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISASTER_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Location</Label>
              <Input className="h-9 text-sm" placeholder="e.g. Mumbai, Maharashtra" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Language</Label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.value} onClick={() => setForm(f => ({ ...f, language: l.value }))}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${form.language === l.value ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : "border-border hover:border-muted-foreground text-muted-foreground"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Description</Label>
              <Textarea className="text-sm resize-none" rows={4} placeholder="Describe the emergency in detail: what you see, how many people affected, immediate dangers…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={() => mutate()} disabled={isPending || !form.location || !form.description}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating guidance…</> : <><Brain className="w-4 h-4 mr-2" />Get Emergency Guidance</>}
            </Button>

            {error && (
              <div className="p-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-400">
                Failed to generate guidance. Please try again.
              </div>
            )}

            {/* Quick scenarios */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick test scenarios</p>
              <div className="space-y-1.5">
                {DEMOS.map((d, i) => (
                  <button key={i} onClick={() => setForm(f => ({ ...f, emergencyType: d.type, severity: d.severity, location: d.location, description: d.description }))}
                    className="w-full text-left p-2.5 rounded-lg border hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all text-xs">
                    <p className="font-semibold capitalize">{d.type.replace(/_/g, " ")} — {d.severity}</p>
                    <p className="text-muted-foreground truncate">{d.location}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guidance output */}
          <div className="lg:col-span-3">
            {!guidance ? (
              <div className="rounded-2xl border bg-background p-16 text-center h-full flex flex-col items-center justify-center">
                <Brain className="w-14 h-14 mb-4 text-muted-foreground opacity-20" />
                <p className="font-bold text-lg">Awaiting emergency description</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                  Fill the form and click "Get Emergency Guidance" to receive AI-powered step-by-step protocols
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header badge row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 font-semibold flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />{guidance.language === "hi" ? "हिन्दी" : "English"}
                  </span>
                  <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${guidance.confidence >= 80 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"}`}>
                    {guidance.confidence}% confidence
                  </span>
                </div>

                {/* Hindi instructions banner */}
                {guidance.hindiInstructions && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 p-4">
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">🇮🇳 हिंदी निर्देश</p>
                    <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">{guidance.hindiInstructions}</p>
                  </div>
                )}

                {/* Immediate Actions — most critical section */}
                <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-background p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <h3 className="font-bold text-red-600 dark:text-red-400">Immediate Actions</h3>
                  </div>
                  <ol className="space-y-2.5">
                    {guidance.immediateActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-full flex items-center justify-center text-xs font-black">{i + 1}</span>
                        <span className="text-sm leading-relaxed">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Medical Guidance */}
                  {guidance.medicalGuidance.length > 0 && (
                    <div className="rounded-2xl border bg-background p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <h3 className="font-bold text-sm">Medical Guidance</h3>
                      </div>
                      <ul className="space-y-2">
                        {guidance.medicalGuidance.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evacuation Protocol */}
                  {guidance.evacuationProtocol.length > 0 && (
                    <div className="rounded-2xl border bg-background p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <h3 className="font-bold text-sm">Evacuation Protocol</h3>
                      </div>
                      <ul className="space-y-2">
                        {guidance.evacuationProtocol.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Local Resources */}
                {guidance.localResources.length > 0 && (
                  <div className="rounded-2xl border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <h3 className="font-bold text-sm">Local Emergency Resources</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {guidance.localResources.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{r.name}</p>
                            <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">{r.contact}</p>
                            <p className="text-xs text-muted-foreground">{r.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Do NOTs */}
                {guidance.doNots.length > 0 && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-red-500" />
                      <h3 className="font-bold text-sm text-red-700 dark:text-red-400">Do NOT</h3>
                    </div>
                    <ul className="space-y-2">
                      {guidance.doNots.map((d, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-red-700 dark:text-red-400">
                          <span className="flex-shrink-0 font-black text-red-500">✗</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Government Guidelines */}
                {guidance.governmentGuidelines && (
                  <div className="rounded-2xl border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🏛️</span>
                      <h3 className="font-bold text-sm">Government Guidelines</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{guidance.governmentGuidelines}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
