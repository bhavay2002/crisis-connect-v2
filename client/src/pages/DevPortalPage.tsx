import { Link } from "wouter";
import {
  BarChart3, Zap, Brain, Code, Key, Webhook, FileText,
  Activity, ArrowUpRight, Globe,
} from "lucide-react";

const TOOLS = [
  {
    title: "Developer Platform",
    description: "Manage API keys, register webhooks, and explore interactive API documentation.",
    href: "/developer",
    icon: Code,
    tags: ["API Keys", "Webhooks", "API Docs"],
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "API Analytics",
    description: "Monitor API usage, request volume, error rates, latency, and per-key utilization.",
    href: "/api-analytics",
    icon: BarChart3,
    tags: ["Usage Metrics", "Error Rate", "Latency"],
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    title: "Async Pipeline",
    description: "Observe the backend job queue and AI processing pipeline in real time.",
    href: "/async-pipeline",
    icon: Zap,
    tags: ["Job Queue", "Workers", "AI Jobs"],
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    title: "Adaptive Fusion",
    description: "Inspect the self-correcting signal weight model, training metrics, and outcome feed.",
    href: "/adaptive-fusion",
    icon: Brain,
    tags: ["ML Model", "Weights", "F1 Score"],
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

const QUICK_LINKS = [
  { label: "API Keys",        href: "/developer",      icon: Key },
  { label: "Webhooks",        href: "/developer",      icon: Webhook },
  { label: "SDK Docs",        href: "/developer",      icon: FileText },
  { label: "Usage Metrics",   href: "/api-analytics",  icon: Activity },
];

export default function DevPortalPage() {
  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-8">
      {/* Header */}
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/30 p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Separate Platform</p>
                <p className="text-xs text-muted-foreground font-mono">developer.crisisconnect.com</p>
              </div>
            </div>
            <h1 className="text-3xl font-black">Developer Portal</h1>
            <p className="text-muted-foreground max-w-xl">
              Infrastructure and integration tools for platform engineers and API consumers.
              These are not operational — they support the technical backbone of CrisisConnect.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold self-end">
              Non-operational
            </span>
            <span className="text-xs text-muted-foreground">Admin & Super Admin only</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t">
          {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href}>
              <a className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-background hover:bg-accent transition-colors">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
              </a>
            </Link>
          ))}
        </div>
      </div>

      {/* Tool cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLS.map(({ title, description, href, icon: Icon, tags, color, bg }) => (
            <Link key={href} href={href}>
              <a className="group block rounded-2xl border bg-background p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </a>
            </Link>
          ))}
        </div>
      </div>

      {/* Info callout */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-5">
        <div className="flex gap-3">
          <Globe className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
              Intended for a separate subdomain
            </p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
              These tools are designed to live at <span className="font-mono font-semibold">developer.crisisconnect.com</span> — a standalone developer hub separate from the operational product. They are accessible here for platform administrators during this phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
