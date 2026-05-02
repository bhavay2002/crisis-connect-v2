import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart3, MapPin, Clock, Users, TrendingUp, AlertTriangle,
  CheckCircle, Package, Download, FileJson, FileSpreadsheet
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

interface AnalyticsSummary {
  totalEvents: number;
  reportSubmitted: number;
  reportVerified: number;
  reportResolved: number;
  resourceRequested: number;
  resourceFulfilled: number;
  aidOffered: number;
  aidDelivered: number;
  avgResponseTime: number;
}

function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [headers.join(",")];
  for (const row of data) {
    const values = headers.map(h => {
      const v = row[h];
      return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function AnalyticsDashboard() {
  const { data: summary } = useQuery<AnalyticsSummary>({ queryKey: ["/api/analytics/summary"] });
  const { data: disasterFrequency } = useQuery<Record<string, number>>({ queryKey: ["/api/analytics/disaster-frequency"] });
  const { data: geographicData } = useQuery<Array<{ id: string; type: string; severity: string; location: string; latitude: number; longitude: number; status: string }>>({
    queryKey: ["/api/analytics/geographic-impact"],
  });

  const frequencyData = disasterFrequency
    ? Object.entries(disasterFrequency).map(([name, count]) => ({ name: name.replace(/_/g, " "), count }))
    : [];

  const handleExportJSON = () => {
    if (!summary) return;
    downloadFile(JSON.stringify({ summary, disasterFrequency, geographicData }, null, 2), "crisisconnect-analytics.json", "application/json");
  };

  const handleExportCSV = () => {
    if (!frequencyData.length) return;
    downloadFile(convertToCSV(frequencyData, ["name", "count"]), "disaster-frequency.csv", "text/csv");
  };

  const STAT_CARDS = [
    { label: "Reports Submitted",  value: summary?.reportSubmitted  ?? "–", icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-500/10" },
    { label: "Reports Verified",   value: summary?.reportVerified   ?? "–", icon: CheckCircle,   color: "text-blue-500",   bg: "bg-blue-500/10" },
    { label: "Reports Resolved",   value: summary?.reportResolved   ?? "–", icon: CheckCircle,   color: "text-green-500",  bg: "bg-green-500/10" },
    { label: "Resources Requested",value: summary?.resourceRequested ?? "–", icon: Package,       color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Resources Fulfilled",value: summary?.resourceFulfilled ?? "–", icon: Package,       color: "text-emerald-500",bg: "bg-emerald-500/10" },
    { label: "Aid Offered",        value: summary?.aidOffered        ?? "–", icon: Users,         color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Aid Delivered",      value: summary?.aidDelivered      ?? "–", icon: TrendingUp,    color: "text-teal-500",   bg: "bg-teal-500/10" },
    { label: "Avg Response (min)", value: summary?.avgResponseTime != null ? `${Math.round(summary.avgResponseTime)}` : "–", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform-wide performance metrics and insights</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs" data-testid="button-export">
                <Download className="w-3.5 h-3.5 mr-1.5" />Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportJSON} data-testid="button-export-json">
                <FileJson className="h-4 w-4 mr-2" />Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} data-testid="button-export-csv">
                <FileSpreadsheet className="h-4 w-4 mr-2" />Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border bg-background p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", bg)}>
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
              </div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="frequency">
          <TabsList className="h-8">
            <TabsTrigger value="frequency" className="text-xs h-7">Disaster Frequency</TabsTrigger>
            <TabsTrigger value="geographic" className="text-xs h-7">Geographic Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="frequency" className="mt-4">
            <div className="rounded-2xl border bg-background p-5">
              <h3 className="font-bold text-sm mb-4">Disaster Type Frequency</h3>
              {frequencyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Reports" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="geographic" className="mt-4">
            <div className="rounded-2xl border bg-background p-5">
              <h3 className="font-bold text-sm mb-4">Severity Distribution by Location</h3>
              {!geographicData || geographicData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No geographic data available</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Severity pie */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Severity Breakdown</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={(() => {
                            const counts: Record<string, number> = {};
                            geographicData.forEach(r => { counts[r.severity] = (counts[r.severity] || 0) + 1; });
                            return Object.entries(counts).map(([name, value]) => ({ name, value }));
                          })()}
                          cx="50%" cy="50%" outerRadius={80}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {["critical","high","medium","low"].map((_, i) => (
                            <Cell key={i} fill={COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top locations */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top Affected Locations</p>
                    <div className="space-y-2">
                      {(() => {
                        const counts: Record<string, number> = {};
                        geographicData.forEach(r => { counts[r.location] = (counts[r.location] || 0) + 1; });
                        return Object.entries(counts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([loc, cnt]) => (
                            <div key={loc} className="flex items-center gap-3 text-sm">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs font-medium truncate">{loc}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{cnt}</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-red-500 rounded-full"
                                    style={{ width: `${(cnt / geographicData.length) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
