import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, UserCheck, TrendingDown, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BehavioralProfile {
  userId: string;
  submissionRate: number;
  avgTimeBetweenReports: number;
  locationConsistency: number;
  severityDistribution: Record<string, number>;
  falseReportRate: number;
  anomalyScore: number;
  anomalyFlags: string[];
  trustBadge: "unverified" | "trusted" | "verified_responder" | "elite_responder";
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface AnomalyResult {
  anomalies: {
    detected: boolean;
    type: string;
    description: string;
    affectedArea?: string;
    reportCount: number;
    timeWindowMinutes: number;
  }[];
  checkedAt: string;
}

interface HighRiskResponse {
  highRiskUsers: BehavioralProfile[];
  total: number;
}

const TRUST_BADGE_STYLES: Record<string, { label: string; color: string }> = {
  elite_responder: { label: "Elite Responder", color: "bg-purple-100 text-purple-700" },
  verified_responder: { label: "Verified Responder", color: "bg-blue-100 text-blue-700" },
  trusted: { label: "Trusted", color: "bg-green-100 text-green-700" },
  unverified: { label: "Unverified", color: "bg-gray-100 text-gray-600" },
};

const RISK_COLORS: Record<string, string> = {
  critical: "text-red-600", high: "text-orange-600",
  medium: "text-yellow-600", low: "text-green-600",
};

export default function TrustDashboard() {
  const [tab, setTab] = useState("anomalies");

  const { data: anomalies } = useQuery<AnomalyResult>({
    queryKey: ["/api/trust/anomalies"],
    refetchInterval: 60_000,
  });

  const { data: highRisk } = useQuery<HighRiskResponse>({
    queryKey: ["/api/trust/high-risk-users"],
  });

  return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black">Trust & Fraud Prevention</h1>
          </div>
          <p className="text-sm text-muted-foreground">Behavioral analysis · Anomaly detection · Trust badge system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Anomalies", value: anomalies?.anomalies.length ?? 0, color: "text-red-500",    bg: "bg-red-500/10",    icon: AlertTriangle },
            { label: "High-Risk Users",  value: highRisk?.total ?? 0,             color: "text-orange-500", bg: "bg-orange-500/10", icon: TrendingDown   },
            { label: "Critical Users",   value: (highRisk?.highRiskUsers ?? []).filter(u => u.riskLevel === "critical").length, color: "text-purple-500", bg: "bg-purple-500/10", icon: Eye },
            { label: "Last Check",       value: anomalies?.checkedAt ? formatDistanceToNow(new Date(anomalies.checkedAt), { addSuffix: true }) : "—", color: "text-green-500", bg: "bg-green-500/10", icon: Shield },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-background p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`font-black mt-0.5 ${typeof value === "number" ? "text-2xl" : "text-sm"} ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9">
            <TabsTrigger value="anomalies" className="text-xs">
              System Anomalies
              {anomalies?.anomalies && anomalies.anomalies.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-bold">{anomalies.anomalies.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs">
              High-Risk Users
              {highRisk && highRisk.total > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">{highRisk.total}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anomalies" className="mt-4 space-y-3">
            {(!anomalies?.anomalies || anomalies.anomalies.length === 0) ? (
              <div className="rounded-2xl border bg-background p-12 text-center">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                <p className="font-semibold text-green-600">No anomalies detected</p>
                <p className="text-sm text-muted-foreground mt-1">System is operating normally</p>
              </div>
            ) : anomalies.anomalies.map((a, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-4">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                <div className="flex justify-between items-start pl-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <p className="font-bold text-sm text-yellow-700 dark:text-yellow-400">{a.type.replace(/_/g, " ").toUpperCase()}</p>
                    </div>
                    <p className="text-sm">{a.description}</p>
                    {a.affectedArea && <p className="text-xs text-muted-foreground mt-1">Area: {a.affectedArea}</p>}
                  </div>
                  <div className="text-right text-xs flex-shrink-0 ml-4">
                    <p className="font-bold">{a.reportCount} reports</p>
                    <p className="text-muted-foreground">in {a.timeWindowMinutes}min</p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-3">
            {(!highRisk?.highRiskUsers || highRisk.highRiskUsers.length === 0) ? (
              <div className="rounded-2xl border bg-background p-12 text-center">
                <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                <p className="font-semibold text-green-600">No high-risk users detected</p>
                <p className="text-sm text-muted-foreground mt-1">All users within normal behavioral patterns</p>
              </div>
            ) : highRisk.highRiskUsers.map((user, i) => {
              const badge = TRUST_BADGE_STYLES[user.trustBadge];
              return (
                <div key={i} className={`rounded-2xl border bg-background p-4 shadow-sm ${user.riskLevel === "critical" ? "border-red-300 dark:border-red-700" : ""}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{user.userId.slice(0, 8)}…</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>{badge.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                      user.riskLevel === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                      user.riskLevel === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" : "bg-muted text-muted-foreground"
                    }`}>{user.riskLevel} risk</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Anomaly Score</span>
                      <span className={`font-black ${RISK_COLORS[user.riskLevel]}`}>{user.anomalyScore}/100</span>
                    </div>
                    <Progress value={user.anomalyScore} className={user.anomalyScore > 70 ? "[&>div]:bg-red-500" : user.anomalyScore > 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                    {[
                      { label: "Submissions/24h", value: user.submissionRate },
                      { label: "False Rate",       value: `${Math.round(user.falseReportRate * 100)}%` },
                      { label: "Location Consistency", value: `${user.locationConsistency}%` },
                      { label: "Avg time between", value: `${user.avgTimeBetweenReports}min` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/50 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">{label}</p>
                        <p className="font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                  {user.anomalyFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {user.anomalyFlags.map((flag, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full border border-red-300 text-red-600 dark:text-red-400">{flag.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
  );
}
