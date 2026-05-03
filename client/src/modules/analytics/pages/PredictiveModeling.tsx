import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapContainer, TileLayer, Circle, Popup, Marker } from 'react-leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, CloudRain, Activity, AlertTriangle, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const RISK_LEVEL_COLORS: Record<string, string> = {
  very_low: '#22c55e',
  low: '#84cc16',
  medium: '#f59e0b',
  high: '#ef4444',
  very_high: '#dc2626',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  very_low: 'Very Low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

const DISASTER_TYPE_LABELS: Record<string, string> = {
  fire: 'Fire',
  flood: 'Flood',
  earthquake: 'Earthquake',
  storm: 'Storm',
  road_accident: 'Road Accident',
  epidemic: 'Epidemic',
  landslide: 'Landslide',
  gas_leak: 'Gas Leak',
  building_collapse: 'Building Collapse',
  chemical_spill: 'Chemical Spill',
  power_outage: 'Power Outage',
  water_contamination: 'Water Contamination',
  other: 'Other',
};

export default function PredictiveModeling() {
  const { toast } = useToast();
  const [generatingLocation, setGeneratingLocation] = useState({ area: '', latitude: '', longitude: '' });
  
  const { data: predictions, isLoading } = useQuery({
    queryKey: ['/api/predictions'],
  });

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { area: string; latitude: string; longitude: string }) => {
      return await apiRequest('/api/predictions/generate', { method: 'POST', body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      toast({
        title: 'Success',
        description: 'Predictions generated successfully',
      });
      setGeneratingLocation({ area: '', latitude: '', longitude: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate predictions',
        variant: 'destructive',
      });
    },
  });

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeneratingLocation(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
        },
        (error) => {
          toast({
            title: 'Error',
            description: 'Failed to get current location',
            variant: 'destructive',
          });
        }
      );
    }
  };

  const handleGeneratePredictions = () => {
    if (!generatingLocation.area || !generatingLocation.latitude || !generatingLocation.longitude) {
      toast({
        title: 'Error',
        description: 'Please provide area name, latitude, and longitude',
        variant: 'destructive',
      });
      return;
    }

    generateMutation.mutate(generatingLocation);
  };

  const canGeneratePredictions = Boolean(user && ['ngo', 'admin', 'government'].includes((user as any).role || ''));

  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  const defaultZoom = 5;

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black">Predictive Modeling</h1>
          </div>
          <p className="text-sm text-muted-foreground">AI-powered disaster forecasting using historical data, weather patterns, and seismic activity</p>
        </div>

        {canGeneratePredictions ? (
          <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
            <div className="h-1 bg-blue-600" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <h2 className="font-black text-sm">Generate New Predictions</h2>
                <span className="text-xs text-muted-foreground">Analyze an area to forecast potential disasters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="area">Area Name</Label>
                  <Input
                    id="area"
                    placeholder="e.g., Mumbai, Maharashtra"
                    value={generatingLocation.area}
                    onChange={(e) => setGeneratingLocation(prev => ({ ...prev, area: e.target.value }))}
                    data-testid="input-area"
                  />
                </div>
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="19.076"
                    value={generatingLocation.latitude}
                    onChange={(e) => setGeneratingLocation(prev => ({ ...prev, latitude: e.target.value }))}
                    data-testid="input-latitude"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="72.8777"
                    value={generatingLocation.longitude}
                    onChange={(e) => setGeneratingLocation(prev => ({ ...prev, longitude: e.target.value }))}
                    data-testid="input-longitude"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleGeneratePredictions}
                  disabled={generateMutation.isPending}
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Generate Predictions
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGetCurrentLocation}
                  variant="outline"
                  data-testid="button-current-location"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="map" className="space-y-4">
          <TabsList>
            <TabsTrigger value="map" data-testid="tab-map">Map View</TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="h-[600px] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : predictions && Array.isArray(predictions) && predictions.length > 0 ? (
                <div className="h-[600px] rounded-2xl overflow-hidden">
                  <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {predictions.map((prediction: any) => (
                      <Circle
                        key={prediction.id}
                        center={[parseFloat(prediction.latitude), parseFloat(prediction.longitude)]}
                        radius={prediction.radius}
                        pathOptions={{ color: RISK_LEVEL_COLORS[prediction.riskLevel], fillColor: RISK_LEVEL_COLORS[prediction.riskLevel], fillOpacity: 0.3 }}
                      >
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-bold mb-2">{prediction.predictedArea}</h3>
                            <div className="space-y-1 text-sm">
                              <p><strong>Type:</strong> {DISASTER_TYPE_LABELS[prediction.disasterType]}</p>
                              <p><strong>Risk Level:</strong> {RISK_LEVEL_LABELS[prediction.riskLevel]}</p>
                              <p><strong>Confidence:</strong> {prediction.confidence}%</p>
                              <p><strong>Valid Until:</strong> {new Date(prediction.validUntil).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </Popup>
                      </Circle>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center text-center p-8">
                  <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Predictions Available</h3>
                  <p className="text-muted-foreground">
                    {canGeneratePredictions ? 'Generate predictions for an area to see risk forecasts' : 'No predictions have been generated yet'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : predictions && Array.isArray(predictions) && predictions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {predictions.map((prediction: any) => (
                  <div key={prediction.id} data-testid={`card-prediction-${prediction.id}`}
                    className="rounded-2xl border bg-background shadow-sm overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: RISK_LEVEL_COLORS[prediction.riskLevel] }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-sm">{DISASTER_TYPE_LABELS[prediction.disasterType]}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                              style={{ backgroundColor: RISK_LEVEL_COLORS[prediction.riskLevel] }}
                              data-testid="badge-risk-level">
                              {RISK_LEVEL_LABELS[prediction.riskLevel]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{prediction.predictedArea}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black" data-testid="text-confidence">{prediction.confidence}%</p>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Radius</span>
                          <span className="font-semibold">{(prediction.radius / 1000).toFixed(1)} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valid Until</span>
                          <span className="font-semibold">{new Date(prediction.validUntil).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {prediction.predictionFactors && prediction.predictionFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {prediction.predictionFactors.map((factor: string, index: number) => (
                            <span key={index} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
                              data-testid={`badge-factor-${index}`}>
                              {factor === 'historical_pattern' && <Activity className="w-3 h-3" />}
                              {factor === 'weather_alert' && <CloudRain className="w-3 h-3" />}
                              {factor === 'seismic_activity' && <Activity className="w-3 h-3" />}
                              {factor.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {prediction.weatherData && (
                        <Alert className="py-2">
                          <CloudRain className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Weather Alert:</strong> {prediction.weatherData.alert || JSON.stringify(prediction.weatherData)}
                          </AlertDescription>
                        </Alert>
                      )}
                      {prediction.seismicData && (
                        <Alert className="py-2 mt-2">
                          <Activity className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Seismic Activity:</strong> {prediction.seismicData.recentQuakes || 0} recent earthquakes, max magnitude {prediction.seismicData.maxMagnitude}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl border-2 border-dashed">
                <AlertTriangle className="w-14 h-14 text-muted-foreground mb-3 mx-auto opacity-50" />
                <h3 className="text-lg font-bold mb-1">No Predictions Available</h3>
                <p className="text-sm text-muted-foreground">
                  {canGeneratePredictions ? 'Generate predictions for an area to see risk forecasts' : 'No predictions have been generated yet'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
