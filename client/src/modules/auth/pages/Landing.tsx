import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import heroImage from "@assets/generated_images/Emergency_response_team_coordination_9097dcd9.png";
import {
  AlertTriangle, Shield, MapPinned, Users, Bell, CheckCircle, Brain,
  Zap, Globe, ShieldCheck, Activity, Code, BarChart3, Radio, Heart,
  Lock, Wifi, Database, ChevronRight, ArrowRight, Star, Building2,
} from "lucide-react";

const FEATURES = [
  { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", title: "Real-Time Reporting", desc: "Multi-type disaster reports with GPS, severity levels, image/voice evidence, and instant verification workflows." },
  { icon: Brain,         color: "text-purple-500", bg: "bg-purple-500/10", title: "Multimodal AI Fusion", desc: "Text + voice + image signals fused via GPT-4o vision — 40/30/30 weighted scoring with explainable output." },
  { icon: Zap,           color: "text-yellow-500", bg: "bg-yellow-500/10", title: "Crisis Simulation Engine", desc: "Inject synthetic events (flood, earthquake, epidemic) into the live system to stress-test response pipelines." },
  { icon: Globe,         color: "text-teal-500",   bg: "bg-teal-500/10",   title: "Digital Twin City Model", desc: "BFS graph propagation across 15-node city model — predict spread, bottlenecks, and responder travel time." },
  { icon: ShieldCheck,   color: "text-blue-500",   bg: "bg-blue-500/10",   title: "AI Decision Override", desc: "Human-in-the-loop governance: queue low-confidence AI decisions for admin review with full audit trail." },
  { icon: MapPinned,     color: "text-green-500",  bg: "bg-green-500/10",  title: "Interactive Risk Map", desc: "Live Leaflet map with heatmap overlays, cluster visualization, real-time incident pins." },
  { icon: Radio,         color: "text-orange-500", bg: "bg-orange-500/10", title: "Broadcast Alerts", desc: "Mass notifications via WebSocket, SMS (Twilio), and email — targetable by role, region, and severity." },
  { icon: Activity,      color: "text-cyan-500",   bg: "bg-cyan-500/10",   title: "Prometheus Monitoring", desc: "141-line Prometheus metrics endpoint — http_requests_total, response time histograms, circuit breaker states." },
  { icon: Code,          color: "text-indigo-500", bg: "bg-indigo-500/10", title: "Developer Platform", desc: "API key management (free/paid/enterprise tiers), webhook subscriptions with HMAC signing, public v1 API." },
  { icon: BarChart3,     color: "text-pink-500",   bg: "bg-pink-500/10",   title: "Predictive Analytics", desc: "Risk scoring, trend forecasting, AI-powered intelligence dashboard with explainable decision logs." },
  { icon: Heart,         color: "text-rose-500",   bg: "bg-rose-500/10",   title: "Aid Matching Engine", desc: "Semantic similarity matching between volunteers/NGOs and resource requests with weighted scoring." },
  { icon: Lock,          color: "text-slate-500",  bg: "bg-slate-500/10",  title: "GDPR Compliance", desc: "Data export, right-to-erasure, retention policies, consent management, full audit log per GDPR spec." },
];

const STATS = [
  { value: "18", label: "Spec Sections", sub: "§1–§18 implemented" },
  { value: "141", label: "Prometheus Metrics", sub: "Live telemetry lines" },
  { value: "7",  label: "Disaster Scenarios", sub: "Simulation engine" },
  { value: "15", label: "City Nodes", sub: "Digital twin model" },
];

const TECH = [
  "Node.js + Express", "React + Vite", "PostgreSQL + Drizzle",
  "WebSockets", "GPT-4o Vision", "Prometheus", "Leaflet Maps",
  "Redis-style EventBus", "Circuit Breakers", "HMAC Webhooks",
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Topbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">CrisisConnect</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#platform" className="hover:text-white transition-colors">Platform</a>
          <a href="#tech" className="hover:text-white transition-colors">Tech Stack</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={() => setLocation("/login")} data-testid="button-login">
            Sign In
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setLocation("/register")} data-testid="button-get-started">
            Get Started
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center pt-20 pb-16 px-6 overflow-hidden">
        {/* Background image + overlays */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Emergency response" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/70 to-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 via-transparent to-blue-950/30" />
        </div>
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Research-grade Disaster Intelligence Platform — §1–§18 Complete
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-none tracking-tight">
            <span className="text-white">Crisis</span>
            <span className="text-red-500">Connect</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            AI-Powered Crisis Intelligence + Real-Time Infrastructure +<br className="hidden md:block" />
            Predictive Analytics + Human Control Layer
          </p>
          <p className="text-slate-500 mb-10 max-w-2xl mx-auto">
            The only disaster management platform with multimodal AI fusion, live city digital twin simulation, Prometheus observability, and a full developer ecosystem — production-grade from day one.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white text-base px-8 h-12 rounded-xl" onClick={() => setLocation("/register")} data-testid="button-join-now">
              Launch Command Center <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-base px-8 h-12 rounded-xl" onClick={() => setLocation("/login")}>
              Sign In
            </Button>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-sm font-semibold text-slate-300">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-600">
          <ChevronRight className="w-5 h-5 rotate-90" />
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section id="features" className="py-24 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              Full Spec Implementation
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Every Feature. Production-Grade.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              From citizen reporting to AI decision governance — 18 specification sections, all shipped.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="group p-5 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/15 hover:bg-slate-800 transition-all duration-200 cursor-default">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-bold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform identity ── */}
      <section id="platform" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                §18 — Product Identity
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                Beyond a Reporting App.<br /><span className="text-red-500">It's a Platform.</span>
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                CrisisConnect isn't a simple CRUD app — it's a research-grade, production-engineered system combining AI intelligence, real-time infrastructure, predictive analytics, and human oversight governance.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Brain,       label: "AI Intelligence Layer",          desc: "Multimodal fusion, RAG knowledge base, explainable decisions" },
                  { icon: Activity,    label: "Real-Time Infrastructure",        desc: "WebSockets, EventBus, circuit breakers, Prometheus metrics" },
                  { icon: BarChart3,   label: "Predictive Analytics Engine",     desc: "Risk scoring, trend forecasting, weather-correlation" },
                  { icon: ShieldCheck, label: "Human Governance Layer",          desc: "AI override queue, RBAC, GDPR, audit trails" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{label}</p>
                      <p className="text-slate-500 text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Multimodal Signals", value: "3", sub: "Text · Voice · Image" },
                { label: "Simulation Scenarios", value: "7", sub: "flood → coordinated attack" },
                { label: "City Graph Nodes", value: "15", sub: "Hospitals, bridges, zones" },
                { label: "Override Triggers", value: "3", sub: "Conf / Urgency / Severity" },
                { label: "Integration APIs", value: "3", sub: "Maps · Weather · Hospitals" },
                { label: "Webhook Events", value: "6+", sub: "HMAC-signed delivery" },
                { label: "RBAC Roles", value: "7", sub: "Citizen to Super Admin" },
                { label: "Spec Sections", value: "§18", sub: "100% complete" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="p-4 rounded-xl bg-slate-800/50 border border-white/5 text-center">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section id="tech" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Built With Production-Grade Technologies</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {TECH.map(t => (
              <span key={t} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/5 text-slate-400 text-sm font-mono">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Ready to Take Command?</h2>
          <p className="text-slate-400 text-lg mb-10">
            Join the platform that combines AI intelligence with real human oversight to save lives in real disasters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white text-base px-10 h-12 rounded-xl w-full sm:w-auto" onClick={() => setLocation("/register")}>
              Create Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="ghost" className="text-slate-400 hover:text-white w-full sm:w-auto" onClick={() => setLocation("/login")}>
              Already have an account? Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-white/5 bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">CrisisConnect</span>
          </div>
          <p className="text-slate-600 text-sm flex items-center gap-2">
            <Lock className="w-3 h-3" /> 256-bit Encryption · AES-256-GCM messages · GDPR compliant
          </p>
          <p className="text-slate-700 text-xs">Production-grade disaster management platform</p>
        </div>
      </footer>
    </div>
  );
}
