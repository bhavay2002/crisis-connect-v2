import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Trust & Fraud Prevention
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Behavioral analysis · Anomaly detection · Trust badge system
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600">
                {anomalies?.anomalies.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Active Anomalies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-orange-600">
                {highRisk?.total ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">High-Risk Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">
                {(highRisk?.highRiskUsers ?? []).filter(u => u.riskLevel === "critical").length}
              </p>
              <p className="text-xs text-muted-foreground">Critical Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">
                {anomalies?.checkedAt ? formatDistanceToNow(new Date(anomalies.checkedAt), { addSuffix: true }) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Last Check</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="anomalies">System Anomalies</TabsTrigger>
            <TabsTrigger value="users">High-Risk Users</TabsTrigger>
          </TabsList>

          <TabsContent value="anomalies" className="space-y-3">
            {(!anomalies?.anomalies || anomalies.anomalies.length === 0) ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Shield className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-green-600">No anomalies detected</p>
                  <p className="text-sm text-muted-foreground">System is operating normally</p>
                </CardContent>
              </Card>
            ) : (
              anomalies.anomalies.map((a, i) => (
                <Alert key={i} className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{a.type.replace(/_/g, " ").toUpperCase()}</p>
                        <p className="text-sm">{a.description}</p>
                        {a.affectedArea && (
                          <p className="text-xs text-muted-foreground">Area: {a.affectedArea}</p>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-bold">{a.reportCount} reports</p>
                        <p className="text-muted-foreground">in {a.timeWindowMinutes}min</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            {(!highRisk?.highRiskUsers || highRisk.highRiskUsers.length === 0) ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-green-600">No high-risk users detected</p>
                  <p className="text-sm text-muted-foreground">All users within normal behavioral patterns</p>
                </CardContent>
              </Card>
            ) : (
              highRisk.highRiskUsers.map((user, i) => {
                const badge = TRUST_BADGE_STYLES[user.trustBadge];
                return (
                  <Card key={i} className={user.riskLevel === "critical" ? "border-red-300" : ""}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">
                              {user.userId.slice(0, 8)}...
                            </span>
                            <Badge className={badge.color}>{badge.label}</Badge>
                            <Badge className={user.riskLevel === "critical" ? "bg-red-100 text-red-700" :
                              user.riskLevel === "high" ? "bg-orange-100 text-orange-700" : ""}>
                              {user.riskLevel} risk
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Anomaly Score</span>
                              <span className={`font-bold ${RISK_COLORS[user.riskLevel]}`}>
                                {user.anomalyScore}/100
                              </span>
                            </div>
                            <Progress
                              value={user.anomalyScore}
                              className={user.anomalyScore > 70 ? "[&>div]:bg-red-500" :
                                user.anomalyScore > 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}
                            />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Submissions/24h</span>
                              <p className="font-bold">{user.submissionRate}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">False Rate</span>
                              <p className="font-bold">
                                {Math.round(user.falseReportRate * 100)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Location Consistency</span>
                              <p className="font-bold">{user.locationConsistency}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg time between</span>
                              <p className="font-bold">{user.avgTimeBetweenReports}min</p>
                            </div>
                          </div>
                          {user.anomalyFlags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {user.anomalyFlags.map((flag, j) => (
                                <Badge key={j} variant="outline" className="text-xs text-red-600 border-red-300">
                                  {flag.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
