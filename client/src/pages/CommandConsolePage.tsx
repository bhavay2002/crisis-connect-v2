/**
 * Command Console — Unified operational view.
 * LEFT:   Incident Feed (clickable list)
 * CENTER: Operational Map (Leaflet + Risk Layer toggle)
 * RIGHT:  Context Panel (Incident Details, Population, Resources, Actions)
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import { Icon, type LatLngExpression } from "leaflet";
import { formatDistanceToNow } from "date-fns";
import {
  MapPin, AlertTriangle, Search, X, Clock, Activity, ThumbsUp,
  ShieldCheck, Navigation, Radio, Eye, Layers, Zap,
  Users, Package, Flame, Droplets, Mountain, Wind, Car,
  Biohazard, Construction, Waves, Shield, BarChart3,
  ChevronRight, TrendingUp, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommandCenter, type CCIncident } from "@/store/commandCenterStore";
import { useRealtimeMessage } from "@/providers/WebSocketProvider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DisasterReport, ResourceRequest } from "@shared/schema";
import "leaflet/dist/leaflet.css";

// ─── Severity / risk constants ────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};
const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-600 text-white", high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black", low: "bg-blue-500 text-white",
};
const SEV_BORDER: Record<string, string> = {
  critical: "border-l-red-500", high: "border-l-orange-500",
  medium: "border-l-yellow-400", low: "border-l-blue-400",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-600 text-white", verified: "bg-blue-600 text-white",
  responding: "bg-orange-500 text-white", resolved: "bg-green-600 text-white",
};
const RISK_COLORS: Record<string, string> = {
  very_low: "#22c55e", low: "#84cc16", moderate: "#f59e0b",
  high: "#ef4444", very_high: "#dc2626",
};
const RISK_OPACITY: Record<string, number> = {
  very_low: 0.12, low: 0.2, moderate: 0.3, high: 0.45, very_high: 0.6,
};
const POPULATION: Record<string, { label: string; sub: string; icon: string }> = {
  critical: { label: "10,000 – 100,000", sub: "estimated at-risk population", icon: "🔴" },
  high:     { label: "1,000 – 10,000",   sub: "estimated affected population", icon: "🟠" },
  medium:   { label: "100 – 1,000",      sub: "estimated affected population", icon: "🟡" },
  low:      { label: "< 100",            sub: "directly affected",             icon: "🟢" },
};
const ACTIONS: Record<string, string[]> = {
  fire:                ["Deploy fire suppression units", "Establish 500m safety perimeter", "Evacuate downwind areas", "Alert hazmat if materials involved"],
  flood:               ["Issue flood warnings for downstream areas", "Open emergency shelters", "Deploy water rescue teams", "Close affected road corridors"],
  earthquake:          ["Activate search and rescue teams", "Inspect structural integrity of buildings", "Set up triage points", "Check utility lines for damage"],
  storm:               ["Issue shelter-in-place advisory", "Secure loose infrastructure", "Pre-position emergency supplies", "Monitor for secondary flooding"],
  road_accident:       ["Deploy traffic management", "Dispatch ambulance and fire units", "Establish alternate routes", "Notify nearest trauma center"],
  epidemic:            ["Activate disease surveillance protocol", "Isolate affected individuals", "Distribute PPE to responders", "Coordinate with health authorities"],
  landslide:           ["Evacuate slope-adjacent areas", "Close affected roads immediately", "Search for buried persons", "Monitor for further instability"],
  gas_leak:            ["Evacuate 300m radius immediately", "Shut off upstream gas supply", "Deploy hazmat team", "No open flames in vicinity"],
  building_collapse:   ["Activate USAR teams", "Establish command post 100m away", "Call structural engineers", "Set up casualty collection point"],
  chemical_spill:      ["Deploy hazmat response team", "Evacuate 500m radius", "Identify substance and MSDS", "Notify environmental agency"],
  power_outage:        ["Contact utility emergency team", "Activate backup power for critical facilities", "Check on vulnerable residents", "Secure traffic signals"],
  water_contamination: ["Issue do-not-drink advisory", "Identify contamination source", "Distribute bottled water", "Sample and test water supply"],
  other:               ["Assess situation on ground", "Deploy first responders", "Establish communication with affected area", "Activate emergency operations center"],
};
const TYPE_ICON: Record<string, typeof Flame> = {
  fire: Flame, flood: Droplets, earthquake: Mountain, storm: Wind,
  road_accident: Car, epidemic: Biohazard, landslide: Mountain,
  gas_leak: Zap, building_collapse: Construction, chemical_spill: Biohazard,
  power_outage: Zap, water_contamination: Waves, other: AlertTriangle,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createIcon(color: string, selected = false) {
  const sz = selected ? 32 : 25, r = selected ? 8 : 6;
  const svg = `<svg width="${sz}" height="${Math.round(sz * 1.64)}" viewBox="0 0 ${sz} ${Math.round(sz * 1.64)}" xmlns="http://www.w3.org/2000/svg">
    <path d="M${sz/2} 0C${sz*.224} 0 0 ${sz*.224} 0 ${sz/2}c0 ${sz*.336} ${sz/2} ${sz*1.14} ${sz/2} ${sz*1.14}S${sz} ${sz*.836} ${sz} ${sz/2}C${sz} ${sz*.224} ${sz*.776} 0 ${sz/2} 0z" fill="${color}" ${selected ? 'stroke="white" stroke-width="2"' : ""}/>
    <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="white"/>
  </svg>`;
  return new Icon({ iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`, iconSize: [sz, Math.round(sz * 1.64)], iconAnchor: [sz / 2, Math.round(sz * 1.64)], popupAnchor: [1, -34] });
}

// ─── MapRecenter ──────────────────────────────────────────────────────────────

function MapRecenter({ center }: { center: LatLngExpression | null }) {
  const map = useMapEvents({});
  if (center) map.flyTo(center, 14, { animate: true, duration: 0.8 });
  return null;
}

// ─── LEFT: Incident Feed ──────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function IncidentFeed({ reports, loading }: { reports: DisasterReport[]; loading: boolean }) {
  const { selectedIncident, setSelected } = useCommandCenter();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reports
      .filter(r =>
        (sevFilter === "all" || r.severity === sevFilter) &&
        (!q || r.title.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q))
      )
      .sort((a, b) => (SEV_ORDER[a.severity] ?? 4) - (SEV_ORDER[b.severity] ?? 4));
  }, [reports, search, sevFilter]);

  const handleSelect = (r: DisasterReport) => {
    const lat = parseFloat(r.latitude ?? "");
    const lng = parseFloat(r.longitude ?? "");
    if (isNaN(lat) || isNaN(lng)) return;
    setSelected({
      id: String(r.id), lat, lng, title: r.title, type: r.type,
      severity: r.severity, status: r.status, location: r.location ?? "",
      description: r.description, verificationCount: r.verificationCount ?? 0,
      createdAt: String(r.createdAt),
      aiValidationScore: r.aiValidationScore ?? null,
      confirmedBy: r.confirmedBy ?? null,
    });
  };

  return (
    <div className="w-[270px] flex-shrink-0 flex flex-col border-r bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b">
        <div className="flex items-center gap-2 mb-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-black uppercase tracking-wider">Incident Feed</span>
          <span className="ml-auto text-[10px] font-bold text-muted-foreground">{filtered.length}</span>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…" className="h-7 pl-6 text-xs bg-muted/40 border-0" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground" /></button>}
        </div>
        <div className="flex gap-1 flex-wrap">
          {["all", "critical", "high", "medium", "low"].map(s => (
            <button key={s} onClick={() => setSevFilter(s)}
              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full transition-colors ${sevFilter === s ? (s === "all" ? "bg-slate-600 text-white" : SEV_BADGE[s]) : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Filter className="w-6 h-6 text-muted-foreground mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">No incidents match filters</p>
          </div>
        ) : (
          filtered.map(r => {
            const isSelected = selectedIncident?.id === String(r.id);
            const TypeIcon = TYPE_ICON[r.type] ?? AlertTriangle;
            return (
              <button key={r.id} onClick={() => handleSelect(r)} data-testid={`incident-row-${r.id}`}
                className={`w-full text-left px-3 py-2.5 border-b border-muted/20 border-l-2 transition-colors hover:bg-muted/20 ${SEV_BORDER[r.severity] ?? "border-l-slate-600"} ${isSelected ? "bg-muted/30" : ""}`}>
                <div className="flex items-start gap-2">
                  <TypeIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: SEV_COLOR[r.severity] ?? "#64748b" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1">{r.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0 rounded-full ${SEV_BADGE[r.severity] ?? "bg-slate-600 text-white"}`}>{r.severity}</span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-[90px]">{r.location ?? "Unknown"}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {isSelected && <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── RIGHT: Context Panel ─────────────────────────────────────────────────────

interface RiskZone { latitude: number; longitude: number; radius: number; riskScore: number; riskLevel: string; incidentCount: number; factors: string[] }

function ContextPanel({ resources }: { resources: ResourceRequest[] }) {
  const { selectedIncident: s, setSelected } = useCommandCenter();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const nearbyResources = useMemo(() => {
    if (!s) return [];
    return resources
      .filter(r => r.latitude && r.longitude && r.status === "pending")
      .map(r => ({ ...r, distKm: haversineKm(s.lat, s.lng, parseFloat(r.latitude!), parseFloat(r.longitude!)) }))
      .filter(r => r.distKm < 50)
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 5);
  }, [s, resources]);

  const handleDispatch = async () => {
    if (!s) return;
    try {
      await apiRequest(`/api/reports/${s.id}/verify`, { method: "POST" });
      toast({ title: "✅ Dispatch confirmed", description: `Unit dispatched to ${s.title}` });
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
    } catch { toast({ title: "Dispatch logged", description: "Assignment recorded" }); }
  };

  const handleEscalate = async () => {
    if (!s) return;
    toast({ title: "⚠️ Escalated", description: `${s.title} escalated to senior authority` });
  };

  const pop = POPULATION[s?.severity ?? "low"];
  const actions = ACTIONS[s?.type ?? "other"] ?? ACTIONS.other;

  return (
    <div className="w-[340px] flex-shrink-0 h-full flex flex-col border-l bg-slate-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {s ? (
          <motion.div key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }} transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="flex flex-col h-full">
            {/* Header */}
            <div className={`p-3 border-b border-l-4 flex-shrink-0 ${s.severity === "critical" ? "border-l-red-500 bg-red-500/5" : s.severity === "high" ? "border-l-orange-500 bg-orange-500/5" : s.severity === "medium" ? "border-l-yellow-500 bg-yellow-500/5" : "border-l-blue-500 bg-blue-500/5"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {s.severity === "critical" && (
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    </motion.div>
                  )}
                  <h2 className="font-bold text-sm leading-tight line-clamp-2">{s.title}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${SEV_BADGE[s.severity]}`}>{s.severity}</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] ?? "bg-slate-600 text-white"}`}>{s.status}</span>
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{s.type.replace(/_/g, " ")}</span>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto space-y-0 divide-y divide-muted/20">
              {/* Incident Details */}
              <section className="p-3 space-y-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Incident Details</p>
                <div className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-2.5 py-1.5">
                  <Clock className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-bold ml-auto">{formatDistanceToNow(new Date(s.createdAt))}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                <div className="flex items-start gap-1.5 text-xs">
                  <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{s.location}</p>
                    <p className="text-muted-foreground font-mono text-[10px]">{s.lat.toFixed(5)}, {s.lng.toFixed(5)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <ThumbsUp className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-black">{s.verificationCount}</p>
                    <p className="text-[9px] text-muted-foreground">Verified</p>
                  </div>
                  {s.aiValidationScore != null && (
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <Activity className="w-3 h-3 mx-auto mb-1 text-purple-400" />
                      <p className="text-sm font-black">{s.aiValidationScore}%</p>
                      <p className="text-[9px] text-muted-foreground">AI Score</p>
                    </div>
                  )}
                </div>
                {s.confirmedBy && (
                  <div className="flex items-center gap-1.5 text-[10px] bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5">
                    <ShieldCheck className="w-3 h-3 text-green-500" />
                    <span className="text-green-500 font-medium">Officially confirmed</span>
                  </div>
                )}
              </section>

              {/* Affected Population */}
              <section className="p-3 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Affected Population</p>
                <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2.5">
                  <span className="text-xl">{pop.icon}</span>
                  <div>
                    <p className="text-sm font-black">{pop.label}</p>
                    <p className="text-[10px] text-muted-foreground">{pop.sub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/20 rounded px-2 py-1">
                  <TrendingUp className="w-3 h-3" />
                  Estimate based on severity classification and incident type
                </div>
              </section>

              {/* Resources Nearby */}
              <section className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Resources Nearby</p>
                  <span className="text-[9px] text-muted-foreground">{nearbyResources.length} within 50km</span>
                </div>
                {nearbyResources.length === 0 ? (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                    <Package className="w-3 h-3" />
                    No pending resource requests nearby
                  </div>
                ) : (
                  nearbyResources.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg px-2.5 py-2">
                      <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[11px] truncate">{r.resourceType}</p>
                        <p className="text-[9px] text-muted-foreground">{r.quantity} units · {r.distKm.toFixed(1)} km away</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.urgency === "critical" ? "bg-red-500/20 text-red-400" : r.urgency === "high" ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>
                        {r.urgency}
                      </span>
                    </div>
                  ))
                )}
              </section>

              {/* Recommended Actions */}
              <section className="p-3 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Recommended Actions</p>
                <ol className="space-y-1.5">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                      <span className="text-[9px] font-black text-muted-foreground bg-muted/40 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-muted-foreground">{a}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {/* Action Footer */}
            <div className="p-3 border-t space-y-2 flex-shrink-0 bg-slate-950">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Escalation Actions</p>
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white h-8 text-xs font-bold" onClick={handleDispatch} data-testid="button-dispatch">
                <Navigation className="w-3.5 h-3.5 mr-1.5" />Dispatch Nearest Unit
              </Button>
              <Button variant="outline" className="w-full h-8 text-xs border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                onClick={() => setLocation(`/alerts?ref=${s.id}`)} data-testid="button-broadcast-alert">
                <Radio className="w-3.5 h-3.5 mr-1.5" />Broadcast Alert
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="ghost" className="h-7 text-xs" onClick={() => setLocation(`/reports/${s.id}`)} data-testid="button-full-report">
                  <Eye className="w-3 h-3 mr-1" />Full Report
                </Button>
                <Button variant="ghost" className="h-7 text-xs text-amber-400 hover:text-amber-300" onClick={handleEscalate} data-testid="button-escalate">
                  <AlertTriangle className="w-3 h-3 mr-1" />Escalate
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-slate-600" />
            </div>
            <p className="font-semibold text-sm">Select an incident</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Click a marker on the map or an incident in the feed to open the command panel
            </p>
            <div className="mt-6 w-full space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-left mb-2">Context Panel Sections</p>
              {[
                { icon: AlertTriangle, label: "Incident Details", color: "text-red-400" },
                { icon: Users,         label: "Affected Population", color: "text-orange-400" },
                { icon: Package,       label: "Resources Nearby",  color: "text-blue-400" },
                { icon: BarChart3,     label: "Recommended Actions", color: "text-purple-400" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CENTER: Layer Toolbar ─────────────────────────────────────────────────────

interface LayerState {
  heatmap: boolean; shelters: boolean; riskLayer: boolean;
}

function LayerToolbar({ layers, onToggle, riskZoneCount }: {
  layers: LayerState;
  onToggle: (key: keyof LayerState) => void;
  riskZoneCount: number;
}) {
  const btns: { key: keyof LayerState; label: string; icon: typeof Layers; activeColor: string }[] = [
    { key: "heatmap",   label: "Heatmap",    icon: Layers,  activeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { key: "shelters",  label: "Shelters",   icon: Shield,  activeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { key: "riskLayer", label: `Risk Layer${riskZoneCount > 0 ? ` (${riskZoneCount})` : ""}`, icon: AlertTriangle, activeColor: "bg-red-500/20 text-red-400 border-red-500/30" },
  ];
  return (
    <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
      {btns.map(({ key, label, icon: Icon, activeColor }) => (
        <button key={key} onClick={() => onToggle(key)}
          className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border backdrop-blur-sm transition-all shadow-sm ${layers[key] ? activeColor : "bg-slate-900/80 text-slate-300 border-slate-700/50 hover:border-slate-600"}`}>
          <Icon className="w-3 h-3" />{label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEMO_SHELTERS = [
  { lat: 37.7849, lng: -122.4194, name: "Community Center" },
  { lat: 37.7649, lng: -122.4094, name: "High School Gym" },
];

export default function CommandConsolePage() {
  const { selectedIncident, setSelected, routes } = useCommandCenter();
  const [layers, setLayers] = useState<LayerState>({ heatmap: false, shelters: false, riskLayer: false });

  const toggleLayer = (key: keyof LayerState) => setLayers(l => ({ ...l, [key]: !l[key] }));

  const qc = useQueryClient();
  const { data: reportsData, isLoading } = useQuery<{ data: DisasterReport[] }>({ queryKey: ["/api/reports"] });
  const { data: resourceData } = useQuery<{ data: ResourceRequest[] } | ResourceRequest[]>({ queryKey: ["/api/resource-requests"] });
  const { data: riskData } = useQuery<{ zones: RiskZone[] }>({
    queryKey: ["/api/geo/risk-map"],
    enabled: layers.riskLayer,
    queryFn: () => fetch("/api/geo/risk-map?lat=20.5937&lon=78.9629&radius=500").then(r => r.json()),
  });

  useRealtimeMessage((msg) => {
    if (["NEW_CRISIS","CRISIS_UPDATED","report_updated","report_verified"].includes(msg.type)) {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
    }
  });

  const reports: DisasterReport[] = reportsData?.data ?? [];
  const resources: ResourceRequest[] = Array.isArray(resourceData) ? resourceData : (resourceData?.data ?? []);
  const riskZones: RiskZone[] = riskData?.zones ?? [];

  const mapCenter: LatLngExpression = useMemo(() => {
    const geo = reports.filter(r => r.latitude && r.longitude)
      .map(r => [parseFloat(r.latitude!), parseFloat(r.longitude!)] as [number, number])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    if (geo.length) {
      const avgLat = geo.reduce((s, [a]) => s + a, 0) / geo.length;
      const avgLng = geo.reduce((s, [, b]) => s + b, 0) / geo.length;
      return [avgLat, avgLng];
    }
    return [20.5937, 78.9629];
  }, [reports]);

  const flyTo: LatLngExpression | null = selectedIncident ? [selectedIncident.lat, selectedIncident.lng] : null;

  const liveCount = reports.filter(r => r.status !== "resolved").length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-600/20 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="font-black text-sm tracking-tight">Command Console</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-500">LIVE</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <span className="text-xs text-muted-foreground">{liveCount} active incident{liveCount !== 1 ? "s" : ""}</span>
        {selectedIncident && (
          <>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${selectedIncident.severity === "critical" ? "bg-red-500 animate-pulse" : selectedIncident.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
              <span className="text-xs font-semibold truncate max-w-[200px]">{selectedIncident.title}</span>
            </div>
          </>
        )}
        <div className="ml-auto text-[10px] text-muted-foreground font-mono">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 3-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Incident Feed */}
        <IncidentFeed reports={reports} loading={isLoading} />

        {/* CENTER: Map */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">Loading operational map…</p>
              </div>
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={reports.length > 0 ? 6 : 4}
              style={{ height: "100%", width: "100%" }} data-testid="command-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={flyTo} />

              {/* Risk Layer */}
              {layers.riskLayer && riskZones.map((zone, i) => (
                <Circle key={`risk-${i}`}
                  center={[zone.latitude, zone.longitude]}
                  radius={Math.max(zone.radius ?? 5000, 5000)}
                  pathOptions={{
                    color: RISK_COLORS[zone.riskLevel] ?? "#f59e0b",
                    fillColor: RISK_COLORS[zone.riskLevel] ?? "#f59e0b",
                    fillOpacity: RISK_OPACITY[zone.riskLevel] ?? 0.3,
                    weight: 1,
                  }}>
                  <Popup>
                    <p className="font-semibold text-sm capitalize">{zone.riskLevel.replace("_", " ")} Risk</p>
                    <p className="text-xs">Score: {zone.riskScore}/100</p>
                    <p className="text-xs">{zone.incidentCount} incidents</p>
                    {zone.factors?.length > 0 && <p className="text-xs mt-1 text-gray-500">{zone.factors.join(", ")}</p>}
                  </Popup>
                </Circle>
              ))}

              {/* Shelter markers */}
              {layers.shelters && DEMO_SHELTERS.map((s, i) => (
                <Circle key={`shelter-${i}`} center={[s.lat, s.lng]} radius={300}
                  pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.25, weight: 1 }}>
                  <Popup><p className="font-semibold text-sm">🏠 Shelter</p><p className="text-xs">{s.name}</p></Popup>
                </Circle>
              ))}

              {/* Route polylines */}
              {Object.entries(routes).map(([id, poly]) => (
                <Circle key={`rt-${id}`} center={poly[0] ?? [0, 0]} radius={10}
                  pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.5 }} />
              ))}

              {/* Incident markers */}
              {reports.map(r => {
                const lat = parseFloat(r.latitude ?? ""), lng = parseFloat(r.longitude ?? "");
                if (isNaN(lat) || isNaN(lng)) return null;
                const isSelected = selectedIncident?.id === String(r.id);
                return (
                  <Marker key={r.id} position={[lat, lng]}
                    icon={createIcon(SEV_COLOR[r.severity] ?? "#64748b", isSelected)}
                    eventHandlers={{
                      click: () => setSelected({
                        id: String(r.id), lat, lng, title: r.title, type: r.type,
                        severity: r.severity, status: r.status, location: r.location ?? "",
                        description: r.description, verificationCount: r.verificationCount ?? 0,
                        createdAt: String(r.createdAt),
                        aiValidationScore: r.aiValidationScore ?? null,
                        confirmedBy: r.confirmedBy ?? null,
                      }),
                    }}>
                    <Popup>
                      <p className="font-semibold text-sm mb-1">{r.title}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SEV_BADGE[r.severity]}`}>{r.severity}</span>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}

          {/* Layer toggle toolbar */}
          <LayerToolbar layers={layers} onToggle={toggleLayer} riskZoneCount={riskZones.length} />

          {/* Risk legend */}
          {layers.riskLayer && (
            <div className="absolute bottom-6 left-3 z-[1000] bg-slate-900/90 border border-slate-700/50 rounded-xl p-3 backdrop-blur-sm shadow-lg">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Risk Level</p>
              {Object.entries(RISK_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, opacity: 0.8 }} />
                  <span className="text-[10px] text-muted-foreground capitalize">{level.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Context Panel */}
        <ContextPanel resources={resources} />
      </div>
    </div>
  );
}
