import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapContainer, TileLayer, Circle, Popup, Polyline } from "react-leaflet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MapPin, AlertTriangle, Shield, Navigation } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

interface RiskZone {
  latitude: number;
  longitude: number;
  radius: number;
  riskScore: number;
  riskLevel: "very_low" | "low" | "moderate" | "high" | "very_high";
  disasterTypes: string[];
  incidentCount: number;
  lastIncident?: string;
  factors: string[];
}

interface SafeRoute {
  waypoints: { latitude: number; longitude: number; label?: string }[];
  distanceKm: number;
  estimatedMinutes: number;
  riskLevel: "safe" | "moderate" | "avoid";
  avoidedZones: number;
  notes: string[];
}

const RISK_COLORS: Record<string, string> = {
  very_low: "#22c55e",
  low: "#84cc16",
  moderate: "#f59e0b",
  high: "#ef4444",
  very_high: "#dc2626",
};

const RISK_OPACITY: Record<string, number> = {
  very_low: 0.15,
  low: 0.25,
  moderate: 0.35,
  high: 0.5,
  very_high: 0.65,
};

const ROUTE_COLORS: Record<string, string> = {
  safe: "#22c55e",
  moderate: "#f59e0b",
  avoid: "#ef4444",
};

export default function RiskMap() {
  const { toast } = useToast();
  const [center, setCenter] = useState({ lat: "20.5937", lon: "78.9629", radius: "200" });
  const [route, setRoute] = useState({
    fromLat: "", fromLon: "", toLat: "", toLon: "",
  });
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [safeRoute, setSafeRoute] = useState<SafeRoute | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);

  const { mutate: loadRiskMap, isPending: loadingRisk } = useMutation({
    mutationFn: () => apiRequest<{ zones: RiskZone[] }>(
      `/api/geo/risk-map?lat=${center.lat}&lon=${center.lon}&radius=${center.radius}`
    ),
    onSuccess: (data) => {
      setRiskZones(data.zones);
      setMapCenter([parseFloat(center.lat), parseFloat(center.lon)]);
      toast({ title: `Loaded ${data.zones.length} risk zones` });
    },
    onError: () => toast({ title: "Failed to load risk map", variant: "destructive" }),
  });

  const { mutate: optimizeRoute, isPending: loadingRoute } = useMutation({
    mutationFn: () => apiRequest<SafeRoute>("/api/geo/route", {
      method: "POST",
      body: JSON.stringify({
        fromLat: route.fromLat, fromLon: route.fromLon,
        toLat: route.toLat, toLon: route.toLon,
      }),
    }),
    onSuccess: (data) => {
      setSafeRoute(data);
      if (data.waypoints.length > 0) {
        setMapCenter([data.waypoints[0].latitude, data.waypoints[0].longitude]);
      }
      toast({
        title: `Route ${data.riskLevel === "safe" ? "✓ Safe" : "⚠ " + data.riskLevel}`,
        description: `${data.distanceKm}km, ~${data.estimatedMinutes} min`,
      });
    },
    onError: () => toast({ title: "Route optimization failed", variant: "destructive" }),
  });

  const highRiskZones = riskZones.filter(z => z.riskLevel === "high" || z.riskLevel === "very_high");
  const safeZones = riskZones.filter(z => z.riskLevel === "very_low" || z.riskLevel === "low");

  return (
    <DashboardLayout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Geo-Intelligence Risk Map
          </h1>
          <p className="text-muted-foreground text-sm">
            Dynamic risk zones based on historical incidents · Safe route optimization
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Risk Map Area
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      value={center.lat}
                      onChange={e => setCenter(c => ({ ...c, lat: e.target.value }))}
                      placeholder="20.5937"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      value={center.lon}
                      onChange={e => setCenter(c => ({ ...c, lon: e.target.value }))}
                      placeholder="78.9629"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Radius (km)</Label>
                  <Input
                    value={center.radius}
                    onChange={e => setCenter(c => ({ ...c, radius: e.target.value }))}
                    placeholder="200"
                    className="text-sm"
                  />
                </div>
                <Button onClick={() => loadRiskMap()} disabled={loadingRisk} className="w-full" size="sm">
                  {loadingRisk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  Generate Risk Map
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Route Optimizer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">From Lat</Label>
                    <Input value={route.fromLat} onChange={e => setRoute(r => ({ ...r, fromLat: e.target.value }))} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">From Lon</Label>
                    <Input value={route.fromLon} onChange={e => setRoute(r => ({ ...r, fromLon: e.target.value }))} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">To Lat</Label>
                    <Input value={route.toLat} onChange={e => setRoute(r => ({ ...r, toLat: e.target.value }))} className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">To Lon</Label>
                    <Input value={route.toLon} onChange={e => setRoute(r => ({ ...r, toLon: e.target.value }))} className="text-sm" />
                  </div>
                </div>
                <Button
                  onClick={() => optimizeRoute()}
                  disabled={loadingRoute || !route.fromLat || !route.toLat}
                  className="w-full"
                  size="sm"
                  variant="secondary"
                >
                  {loadingRoute ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
                  Optimize Route
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Risk Zones</span>
                  <Badge variant="secondary">{riskZones.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">High Risk</span>
                  <Badge variant="destructive">{highRiskZones.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Safe Zones</span>
                  <Badge className="bg-green-100 text-green-700">{safeZones.length}</Badge>
                </div>
                {safeRoute && (
                  <Alert className={safeRoute.riskLevel === "safe" ? "border-green-400 bg-green-50 dark:bg-green-950" : "border-yellow-400 bg-yellow-50"}>
                    <AlertDescription className="text-xs">
                      <strong>{safeRoute.riskLevel === "safe" ? "✓ Safe Route" : "⚠ " + safeRoute.riskLevel}</strong>
                      <br />{safeRoute.distanceKm}km · ~{safeRoute.estimatedMinutes} min
                      <br />{safeRoute.notes[0]}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Risk Level Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(RISK_COLORS).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs capitalize">{level.replace("_", " ")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                <MapContainer
                  center={mapCenter}
                  zoom={5}
                  style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {riskZones.map((zone, i) => (
                    <Circle
                      key={i}
                      center={[zone.latitude, zone.longitude]}
                      radius={Math.max(zone.radius, 5000)}
                      pathOptions={{
                        color: RISK_COLORS[zone.riskLevel],
                        fillColor: RISK_COLORS[zone.riskLevel],
                        fillOpacity: RISK_OPACITY[zone.riskLevel],
                        weight: zone.riskLevel === "very_high" || zone.riskLevel === "high" ? 2 : 1,
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold capitalize">{zone.riskLevel.replace("_", " ")} Risk Zone</p>
                          <p>Score: {zone.riskScore}/100</p>
                          <p>Incidents: {zone.incidentCount}</p>
                          <p>Types: {zone.disasterTypes.join(", ") || "—"}</p>
                          {zone.factors.length > 0 && (
                            <p className="text-xs text-gray-500">Factors: {zone.factors.join(", ")}</p>
                          )}
                        </div>
                      </Popup>
                    </Circle>
                  ))}
                  {safeRoute && (
                    <Polyline
                      positions={safeRoute.waypoints.map(w => [w.latitude, w.longitude])}
                      pathOptions={{
                        color: ROUTE_COLORS[safeRoute.riskLevel],
                        weight: 4,
                        dashArray: safeRoute.riskLevel !== "safe" ? "8,4" : undefined,
                      }}
                    />
                  )}
                </MapContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* High risk zone table */}
        {highRiskZones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                High Risk Zones ({highRiskZones.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Location</th>
                      <th className="text-left py-2 pr-4">Risk Level</th>
                      <th className="text-left py-2 pr-4">Score</th>
                      <th className="text-left py-2 pr-4">Incidents</th>
                      <th className="text-left py-2">Disaster Types</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskZones.slice(0, 10).map((z, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-xs">
                          {z.latitude.toFixed(2)}, {z.longitude.toFixed(2)}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge
                            className="text-xs"
                            style={{ backgroundColor: RISK_COLORS[z.riskLevel] + "20", color: RISK_COLORS[z.riskLevel] }}
                          >
                            {z.riskLevel.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 font-bold">{z.riskScore}</td>
                        <td className="py-2 pr-4">{z.incidentCount}</td>
                        <td className="py-2 text-xs">{z.disasterTypes.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
