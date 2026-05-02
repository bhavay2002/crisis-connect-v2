import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/queryClient";
import { Brain, BookOpen, Globe, Phone, AlertTriangle, CheckCircle, Loader2, ChevronRight } from "lucide-react";

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
const LANGUAGES = [{ value: "en", label: "English" }, { value: "hi", label: "Hindi" }];

export default function CrisisCopilot() {
  const [form, setForm] = useState({
    emergencyType: "fire",
    severity: "high",
    description: "",
    location: "",
    language: "en",
  });
  const [guidance, setGuidance] = useState<CopilotGuidance | null>(null);

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => apiRequest<CopilotGuidance>("/api/ai/copilot", {
      method: "POST",
      body: JSON.stringify(form),
    }),
    onSuccess: (data) => setGuidance(data),
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            AI Crisis Copilot
          </h1>
          <p className="text-muted-foreground mt-1">
            RAG-powered emergency guidance with step-by-step instructions, Hindi support, and local emergency numbers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Describe Your Emergency
            </CardTitle>
            <CardDescription>
              Get AI-powered, context-aware guidance based on proven emergency protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Emergency Type</Label>
                <Select value={form.emergencyType} onValueChange={v => setForm(f => ({ ...f, emergencyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISASTER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  placeholder="e.g. Mumbai, Maharashtra"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div>
                <Label>Response Language</Label>
                <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the emergency situation in detail..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <Button
              onClick={() => mutate()}
              disabled={isPending || !form.location || !form.description}
              className="w-full"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating guidance...</>
              ) : (
                <><Brain className="w-4 h-4 mr-2" />Get Emergency Guidance</>
              )}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>Failed to get guidance. Please try again.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {guidance && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Emergency Guidance</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Globe className="w-3 h-3 mr-1" />
                  {guidance.language === "hi" ? "हिन्दी" : "English"}
                </Badge>
                <Badge variant="secondary">
                  {guidance.confidence}% confidence
                </Badge>
              </div>
            </div>

            {guidance.hindiInstructions && (
              <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950">
                <AlertDescription className="text-sm font-medium">
                  🇮🇳 {guidance.hindiInstructions}
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Immediate Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {guidance.immediateActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm">{action}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guidance.medicalGuidance.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Medical Guidance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {guidance.medicalGuidance.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {guidance.evacuationProtocol.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Evacuation Protocol
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {guidance.evacuationProtocol.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {guidance.localResources.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    Local Emergency Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {guidance.localResources.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-muted rounded">
                        <div>
                          <p className="font-medium text-sm">{r.name}</p>
                          <p className="text-blue-600 font-bold">{r.contact}</p>
                          <p className="text-xs text-muted-foreground">{r.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {guidance.doNots.length > 0 && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">⚠️ Do NOT</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {guidance.doNots.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                        <span className="flex-shrink-0 font-bold">✗</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {guidance.governmentGuidelines && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">🏛️ Government Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{guidance.governmentGuidelines}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
