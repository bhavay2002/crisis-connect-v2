import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  TrendingUp, 
  Shield, 
  Heart,
  CheckCircle2,
  ThumbsUp,
  Package,
  Clock,
  Target,
  Trophy
} from "lucide-react";
import type { UserReputation } from "@shared/schema";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function ReputationDashboard() {
  const { user } = useAuth();

  const { data: reputation, isLoading } = useQuery<UserReputation>({
    queryKey: ["/api/reputation/me"],
    enabled: !!user,
  });

  const getTrustLevel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-600", variant: "default" as const };
    if (score >= 60) return { label: "Good", color: "text-blue-600", variant: "secondary" as const };
    if (score >= 40) return { label: "Fair", color: "text-yellow-600", variant: "outline" as const };
    return { label: "Building", color: "text-orange-600", variant: "outline" as const };
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {!user ? (
          <div className="rounded-2xl border-2 border-dashed py-16 text-center max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">Please sign in to view your reputation</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !reputation ? (
          <div className="rounded-2xl border-2 border-dashed py-16 text-center max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">No reputation data available</p>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-yellow-500" />
                </div>
                <h1 className="text-2xl font-black">Reputation Dashboard</h1>
              </div>
              <p className="text-sm text-muted-foreground">Track your contributions and build trust in the community</p>
            </div>

            <ReputationContent user={user} reputation={reputation} getTrustLevel={getTrustLevel} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReputationContent({ user, reputation, getTrustLevel }: { user: any, reputation: UserReputation, getTrustLevel: (score: number) => any }) {
  const trustLevel = getTrustLevel(reputation.trustScore);

  const achievements = [
    {
      id: "verified_contributor",
      title: "Verified Contributor",
      description: "Complete identity verification",
      icon: Shield,
      unlocked: user.emailVerified && user.phoneVerified,
      progress: [user.emailVerified, user.phoneVerified, user.aadhaarVerified].filter(Boolean).length,
      total: 3,
    },
    {
      id: "report_master",
      title: "Report Master",
      description: "Submit 10 verified reports",
      icon: CheckCircle2,
      unlocked: reputation.verifiedReports >= 10,
      progress: reputation.verifiedReports,
      total: 10,
    },
    {
      id: "community_validator",
      title: "Community Validator",
      description: "Verify 25 reports",
      icon: ThumbsUp,
      unlocked: reputation.verificationsGiven >= 25,
      progress: reputation.verificationsGiven,
      total: 25,
    },
    {
      id: "helper",
      title: "Community Helper",
      description: "Provide 5 resources",
      icon: Package,
      unlocked: reputation.resourcesProvided >= 5,
      progress: reputation.resourcesProvided,
      total: 5,
    },
    {
      id: "trusted_reporter",
      title: "Trusted Reporter",
      description: "Reach 75+ trust score",
      icon: Trophy,
      unlocked: reputation.trustScore >= 75,
      progress: reputation.trustScore,
      total: 75,
    },
  ];

  return (
    <>
      <div className="mb-6" style={{ display: 'none' }}>
      </div>

      {/* Trust Score */}
      <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-trust-score">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <h3 className="font-bold text-sm">Trust Score</h3>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-5xl font-black" data-testid="text-trust-score-value">{reputation.trustScore}</p>
            <span className={`inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-full font-semibold border ${trustLevel.color}`} data-testid="badge-trust-level">
              {trustLevel.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Trust Level</p>
            <p className={`text-xl font-bold ${trustLevel.color}`}>{trustLevel.label}</p>
          </div>
        </div>
        <Progress value={reputation.trustScore} className="h-2.5" data-testid="progress-trust-score" />
        <p className="text-xs text-muted-foreground mt-2">Complete verifications and contribute to increase your trust score</p>
      </div>

      {/* Contribution Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Reports", value: reputation.totalReports, sub: `${reputation.verifiedReports} verified`, icon: Target, testId: "card-stat-reports", valTestId: "text-stat-total-reports", bg: "bg-blue-500/10", color: "text-blue-500" },
          { label: "Verifications Given", value: reputation.verificationsGiven, sub: "Helping validate reports", icon: CheckCircle2, testId: "card-stat-verifications", valTestId: "text-stat-verifications", bg: "bg-green-500/10", color: "text-green-500" },
          { label: "Upvotes Received", value: reputation.upvotesReceived, sub: "Community trust in reports", icon: ThumbsUp, testId: "card-stat-upvotes", valTestId: "text-stat-upvotes", bg: "bg-purple-500/10", color: "text-purple-500" },
          { label: "Resources Provided", value: reputation.resourcesProvided, sub: `${reputation.resourcesFulfilled} fulfilled`, icon: Package, testId: "card-stat-resources", valTestId: "text-stat-resources", bg: "bg-orange-500/10", color: "text-orange-500" },
          { label: "Accuracy", value: `${reputation.totalReports > 0 ? Math.round(((reputation.totalReports - reputation.falseReports) / reputation.totalReports) * 100) : 100}%`, sub: `${reputation.falseReports} false reports`, icon: Shield, testId: "card-stat-false-reports", valTestId: "text-stat-accuracy", bg: "bg-teal-500/10", color: "text-teal-500" },
          { label: "Avg Response Time", value: reputation.responseTimeAvg ? `${Math.round(reputation.responseTimeAvg / 60)}m` : "N/A", sub: "For aid delivery", icon: Clock, testId: "card-stat-response-time", valTestId: "text-stat-response-time", bg: "bg-indigo-500/10", color: "text-indigo-500" },
        ].map(({ label, value, sub, icon: Icon, testId, valTestId, bg, color }) => (
          <div key={label} className="rounded-xl border bg-background p-4 shadow-sm" data-testid={testId}>
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <p className="text-2xl font-black" data-testid={valTestId}>{value}</p>
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-achievements">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <h3 className="font-bold text-sm">Achievements</h3>
          <p className="text-xs text-muted-foreground">Unlock badges by contributing to the community</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            const progressPercentage = Math.min((achievement.progress / achievement.total) * 100, 100);
            return (
              <div key={achievement.id}
                className={`p-4 rounded-xl border-2 ${achievement.unlocked ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
                data-testid={`achievement-${achievement.id}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full flex-shrink-0 ${achievement.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-sm">{achievement.title}</h4>
                      {achievement.unlocked && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span><span>{achievement.progress}/{achievement.total}</span>
                      </div>
                      <Progress value={progressPercentage} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Improve */}
      <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-improvement-tips">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-pink-500" />
          </div>
          <h3 className="font-bold text-sm">Ways to Improve Your Reputation</h3>
        </div>
        <ul className="space-y-2">
          {[
            "Complete identity verification (email, phone, Aadhaar) for +10 trust score bonus",
            "Submit accurate disaster reports that get verified by the community",
            "Help verify other reports to build community trust",
            "Provide and deliver resources to those in need",
            "Respond quickly to aid requests to improve your response time",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
