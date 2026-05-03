/**
 * Map — composition-only page.
 * All filter logic → useMapFilters (feature hook)
 * All selection logic → useSelectIncident (feature hook)
 * All panel logic → IncidentPanel (feature component)
 */
import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMapEvents } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import { DisasterReport, SOSAlert, ResourceRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subDays, startOfDay, endOfDay } from "date-fns";

import {
  Flame, Droplet, Mountain, Wind, Car, AlertTriangle, MapPin,
  Biohazard, Construction, Waves, Zap, Droplets, SlidersHorizontal, X,
} from "lucide-react";

// ── Feature imports ────────────────────────────────────────────────────────────
import { useMapFilters, useSelectIncident, useCommandCenter } from "@/features/map";
import { IncidentPanel }  from "@/components/map/IncidentPanel";
import { HeatmapLayer }   from "@/components/map/HeatmapLayer";
import { HeatmapLegend }  from "@/components/map/HeatmapLegend";
import { TimelineControl } from "@/components/map/TimelineControl";
import { LayerControl }   from "@/components/map/LayerControl";
import { useCrisisActions } from "@/features/crisis";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const severityColors: Record<string, string> = {
  low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

const TYPE_LABELS: Record<string, string> = {
  fire: "Fire", flood: "Flood", earthquake: "Earthquake", storm: "Storm",
  road_accident: "Road Accident", epidemic: "Epidemic", landslide: "Landslide",
  gas_leak: "Gas Leak", building_collapse: "Building Collapse",
  chemical_spill: "Chemical Spill", power_outage: "Power Outage",
  water_contamination: "Water Contamination", other: "Other",
};

const createIcon = (color: string, selected = false) => {
  const size = selected ? 32 : 25;
  const r    = selected ? 8 : 6;
  const svg  = `<svg width="${size}" height="${Math.round(size*1.64)}" viewBox="0 0 ${size} ${Math.round(size*1.64)}" xmlns="http://www.w3.org/2000/svg">
    <path d="M${size/2} 0C${size*.224} 0 0 ${size*.224} 0 ${size/2}c0 ${size*.336} ${size/2} ${size*1.14} ${size/2} ${size*1.14}S${size} ${size*.836} ${size} ${size/2}C${size} ${size*.224} ${size*.776} 0 ${size/2} 0z" fill="${color}" ${selected?'stroke="white" stroke-width="2"':""}/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="white"/>
  </svg>`;
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize:    [size, Math.round(size*1.64)],
    iconAnchor:  [size/2, Math.round(size*1.64)],
    popupAnchor: [1, -34],
  });
};

const demoShelters      = [{ lat:37.7849,lng:-122.4194,name:"Community Center" },{ lat:37.7649,lng:-122.4094,name:"High School Gym" }];
const demoEvacZones     = [[[37.78,-122.43],[37.77,-122.42],[37.79,-122.41]],[[37.76,-122.40],[37.75,-122.39],[37.77,-122.38]]];
const demoRoads         = [{ lat:37.7749,lng:-122.4294,name:"Main Street" }];

function MapRecenter({ center }: { center: LatLngExpression | null }) {
  const map = useMapEvents({});
  if (center) map.flyTo(center, 14, { animate: true, duration: 0.8 });
  return null;
}

export default function Map() {
  const [, setLocation]    = useLocation();
  const { upvote }         = useCrisisActions();
  const selectIncident     = useSelectIncident();
  const { selectedIncident, routes } = useCommandCenter();

  const [showFilters,    setShowFilters]    = useState(false);
  const [timelineEnabled, setTimelineEnabled] = useState(false);
  const [timelineRange,  setTimelineRange]  = useState<{ start: Date; end: Date }>({
    start: startOfDay(subDays(new Date(), 30)),
    end:   endOfDay(new Date()),
  });
  const [heatmapEnabled,         setHeatmapEnabled]         = useState(false);
  const [heatmapDataSource,      setHeatmapDataSource]      = useState<"all"|"reports"|"sos"|"resources">("all");
  const [sheltersEnabled,        setSheltersEnabled]        = useState(false);
  const [evacuationZonesEnabled, setEvacuationZonesEnabled] = useState(false);
  const [roadsEnabled,           setRoadsEnabled]           = useState(false);

  const { data: reportsResponse, isLoading } = useQuery<{ data: DisasterReport[]; pagination: any }>({ queryKey: ["/api/reports"] });
  const { data: sosAlerts = [] }        = useQuery<SOSAlert[]>({ queryKey: ["/api/sos/active"] });
  const { data: resourceRequests = [] } = useQuery<ResourceRequest[]>({ queryKey: ["/api/resource-requests"] });
  const reports = reportsResponse?.data || [];

  // ── Feature hook: all filter logic encapsulated ───────────────────────────
  const {
    filters, setFilters, filtered,
    activeFilterCount, reset,
  } = useMapFilters(
    timelineEnabled
      ? reports.map(r => ({ ...r, _timelineRange: timelineRange }))
      : reports
  );

  const mapCenter: LatLngExpression = useMemo(() => {
    const lats = filtered.map(r => parseFloat(r.latitude!)).filter(x => !isNaN(x));
    const lngs = filtered.map(r => parseFloat(r.longitude!)).filter(x => !isNaN(x));
    if (lats.length > 0) return [lats.reduce((a,b)=>a+b,0)/lats.length, lngs.reduce((a,b)=>a+b,0)/lngs.length];
    return [37.7749, -122.4194];
  }, [filtered]);

  const heatmapPoints: [number,number,number][] = useMemo(() => {
    const pts: [number,number,number][] = [];
    if (heatmapDataSource === "all" || heatmapDataSource === "reports") {
      filtered.forEach(r => {
        const lat = parseFloat(r.latitude!), lng = parseFloat(r.longitude!);
        if (!isNaN(lat) && !isNaN(lng)) {
          pts.push([lat, lng, r.severity==="critical"?1.0:r.severity==="high"?0.7:r.severity==="medium"?0.5:0.3]);
        }
      });
    }
    if (heatmapDataSource === "all" || heatmapDataSource === "sos") {
      sosAlerts.forEach(s => {
        const lat = parseFloat(s.latitude!), lng = parseFloat(s.longitude!);
        if (!isNaN(lat) && !isNaN(lng)) {
          const base = s.severity==="critical"?1.0:s.severity==="high"?0.7:s.severity==="medium"?0.5:0.3;
          pts.push([lat, lng, Math.min(base*1.5, 1.0)]);
        }
      });
    }
    if (heatmapDataSource === "all" || heatmapDataSource === "resources") {
      resourceRequests.filter(r=>r.status==="pending").forEach(r => {
        const lat = parseFloat(r.latitude!), lng = parseFloat(r.longitude!);
        if (!isNaN(lat) && !isNaN(lng)) {
          pts.push([lat, lng, r.urgency==="critical"?0.9:r.urgency==="high"?0.6:r.urgency==="medium"?0.4:0.2]);
        }
      });
    }
    return pts;
  }, [filtered, sosAlerts, resourceRequests, heatmapDataSource]);

  const dateRange = useMemo(() => {
    if (!reports.length) return { start: startOfDay(subDays(new Date(),30)), end: endOfDay(new Date()) };
    const dates = reports.map(r => new Date(r.createdAt).getTime());
    return { start: startOfDay(new Date(Math.min(...dates))), end: endOfDay(new Date(Math.max(...dates))) };
  }, [reports]);

  const flyToCenter: LatLngExpression | null = selectedIncident ? [selectedIncident.lat, selectedIncident.lng] : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-slate-950 flex-shrink-0">
        <MapPin className="w-4 h-4 text-red-500" />
        <span className="font-black text-sm">Command Map</span>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-500">LIVE</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} incident{filtered.length!==1?"s":""}</span>
          <Button variant={showFilters?"secondary":"outline"} size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant={timelineEnabled?"secondary":"outline"} size="sm" className="h-7 text-xs"
            onClick={() => { setTimelineEnabled(v=>!v); if (!timelineEnabled) setTimelineRange(dateRange); }}>
            Timeline
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-slate-950/80 flex-shrink-0 flex-wrap">
          <Select value={filters.type} onValueChange={v => setFilters(f => ({...f,type:v}))}>
            <SelectTrigger className="h-7 text-xs w-36" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.severity} onValueChange={v => setFilters(f => ({...f,severity:v}))}>
            <SelectTrigger className="h-7 text-xs w-32" data-testid="select-severity-filter">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {["low","medium","high","critical"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.timeRange} onValueChange={v => setFilters(f => ({...f,timeRange:v}))}>
            <SelectTrigger className="h-7 text-xs w-32" data-testid="select-time-filter">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
              onClick={reset} data-testid="button-clear-filters">
              <X className="w-3 h-3 mr-1" />Clear
            </Button>
          )}
        </div>
      )}

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading map data…</p>
              </div>
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={filtered.length>0?10:4}
              style={{ height:"100%", width:"100%" }} data-testid="map-container">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={flyToCenter} />
              {heatmapEnabled && heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}
              {sheltersEnabled && demoShelters.map((s,i) => (
                <Circle key={`sh-${i}`} center={[s.lat,s.lng]} radius={200}
                  pathOptions={{ color:"blue",fillColor:"blue",fillOpacity:0.3 }}>
                  <Popup><p className="font-semibold">Shelter</p><p className="text-sm">{s.name}</p></Popup>
                </Circle>
              ))}
              {evacuationZonesEnabled && demoEvacZones.map((zone,i) => (
                <Polygon key={`ev-${i}`} positions={zone as any}
                  pathOptions={{ color:"red",fillColor:"red",fillOpacity:0.2 }}>
                  <Popup><p className="font-semibold">Evacuation Zone {i+1}</p></Popup>
                </Polygon>
              ))}
              {roadsEnabled && demoRoads.map((r,i) => (
                <Circle key={`rd-${i}`} center={[r.lat,r.lng]} radius={100}
                  pathOptions={{ color:"gray",fillColor:"gray",fillOpacity:0.5 }}>
                  <Popup><p className="font-semibold">{r.name}</p></Popup>
                </Circle>
              ))}
              {Object.entries(routes).map(([id,poly]) => (
                <Polyline key={`route-${id}`} positions={poly}
                  pathOptions={{ color:"#ef4444",weight:3,dashArray:"6 4" }} />
              ))}
              {!heatmapEnabled && filtered.map(report => {
                const lat = parseFloat(report.latitude!);
                const lng = parseFloat(report.longitude!);
                if (isNaN(lat)||isNaN(lng)) return null;
                const isSelected = selectedIncident?.id === report.id;
                return (
                  <Marker key={report.id} position={[lat,lng]}
                    icon={createIcon(severityColors[report.severity]||"#64748b", isSelected)}
                    eventHandlers={{ click: () => selectIncident(report as any) }}>
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-semibold text-sm mb-1">{report.title}</p>
                        <Badge variant={report.severity==="critical"?"destructive":"secondary"} className="text-xs mb-2">
                          {report.severity}
                        </Badge>
                        <Button size="sm" className="w-full h-7 text-xs"
                          onClick={() => selectIncident(report as any)} data-testid={`button-view-details-${report.id}`}>
                          Open Command Panel
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
          <LayerControl
            heatmapEnabled={heatmapEnabled} onHeatmapToggle={setHeatmapEnabled}
            heatmapDataSource={heatmapDataSource} onHeatmapDataSourceChange={setHeatmapDataSource}
            sheltersEnabled={sheltersEnabled} onSheltersToggle={setSheltersEnabled}
            evacuationZonesEnabled={evacuationZonesEnabled} onEvacuationZonesToggle={setEvacuationZonesEnabled}
            roadsEnabled={roadsEnabled} onRoadsToggle={setRoadsEnabled}
          />
          {heatmapEnabled && <HeatmapLegend dataSource={heatmapDataSource} />}
          {timelineEnabled && (
            <TimelineControl startDate={dateRange.start} endDate={dateRange.end}
              onTimeRangeChange={(start,end) => setTimelineRange({start,end})} />
          )}
        </div>

        {/* Incident panel — feature component, no logic in page */}
        <IncidentPanel onVerify={upvote} />
      </div>
    </div>
  );
}
