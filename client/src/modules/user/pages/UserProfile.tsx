import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Mail, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock,
  UserCircle,
  Award,
  Settings
} from "lucide-react";
import { Link } from "wouter";
import type { UserReputation } from "@shared/schema";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function UserProfile() {
  const { user } = useAuth();

  const { data: reputation, isLoading: reputationLoading } = useQuery<UserReputation>({
    queryKey: ["/api/reputation/me"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="rounded-2xl border-2 border-dashed py-16 text-center max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">Please sign in to view your profile</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "government":
        return "default";
      case "ngo":
        return "secondary";
      case "volunteer":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "government":
        return "Government Official";
      case "ngo":
        return "NGO/Organization";
      case "volunteer":
        return "Volunteer";
      case "admin":
        return "Admin";
      default:
        return "Citizen";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <UserCircle className="w-4 h-4 text-blue-500" />
              </div>
              <h1 className="text-2xl font-black">My Profile</h1>
            </div>
            <p className="text-sm text-muted-foreground">Manage your account and verification status</p>
          </div>
          <Link href="/select-role">
            <Button variant="outline" size="sm" data-testid="button-change-role">
              <Settings className="h-4 w-4 mr-2" />Change Role
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* User Info */}
          <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-user-info">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <UserCircle className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <h3 className="font-bold text-sm">Account Information</h3>
            </div>
            <div className="flex items-center gap-3 mb-4">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={user.name || "User"} className="h-14 w-14 rounded-full" data-testid="img-avatar" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-7 w-7 text-primary" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm" data-testid="text-username">{user.name || "User"}</h4>
                <p className="text-xs text-muted-foreground" data-testid="text-email">{user.email}</p>
              </div>
            </div>
            <Separator className="mb-4" />
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <Badge variant={getRoleBadgeVariant(user.role || "citizen")} data-testid={`badge-role-${user.role}`}>
                  {getRoleLabel(user.role || "citizen")}
                </Badge>
              </div>
              {user.phoneNumber && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                  <p className="font-semibold" data-testid="text-phone">{user.phoneNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-verification-status">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-green-500" />
              </div>
              <h3 className="font-bold text-sm">Verification Status</h3>
            </div>
            <p className="text-xs text-muted-foreground pl-9 mb-4">Complete verifications to increase your trust score</p>
            <div className="space-y-2">
              {[
                { icon: Mail, label: "Email", value: user.email, verified: user.emailVerified, testIdTrue: "icon-email-verified", testIdFalse: "icon-email-unverified" },
                { icon: Phone, label: "Phone", value: user.phoneNumber || "Not provided", verified: user.phoneVerified, testIdTrue: "icon-phone-verified", testIdFalse: "icon-phone-unverified" },
                { icon: CreditCard, label: "Aadhaar", value: user.aadhaarNumber ? `**** **** ${user.aadhaarNumber.slice(-4)}` : "Not provided", verified: user.aadhaarVerified, testIdTrue: "icon-aadhaar-verified", testIdFalse: "icon-aadhaar-unverified" },
              ].map(({ icon: Icon, label, value, verified, testIdTrue, testIdFalse }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{value}</p>
                    </div>
                  </div>
                  {verified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" data-testid={testIdTrue} />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" data-testid={testIdFalse} />
                  )}
                </div>
              ))}
            </div>
            <Link href="/verify">
              <Button className="w-full mt-4" data-testid="button-complete-verification">Complete Verification</Button>
            </Link>
          </div>

          {/* Reputation */}
          <div className="rounded-2xl border bg-background p-5 shadow-sm md:col-span-2" data-testid="card-reputation">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Reputation & Trust Score</h3>
                <p className="text-xs text-muted-foreground">Your contributions to the CrisisConnect community</p>
              </div>
            </div>
            {reputationLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reputation ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Trust Score", value: reputation.trustScore, testId: "text-trust-score", color: "text-blue-600 dark:text-blue-400" },
                  { label: "Reports Submitted", value: reputation.totalReports, testId: "text-total-reports" },
                  { label: "Verified Reports", value: reputation.verifiedReports, testId: "text-verified-reports" },
                  { label: "Verifications Given", value: reputation.verificationsGiven, testId: "text-verifications-given" },
                  { label: "Resources Provided", value: reputation.resourcesProvided, testId: "text-resources-provided" },
                  { label: "Upvotes Received", value: reputation.upvotesReceived, testId: "text-upvotes-received" },
                ].map(({ label, value, testId, color }) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-muted/50 border">
                    <p className={`text-2xl font-black ${color || ""}`} data-testid={testId}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No reputation data available</p>
            )}
            <Link href="/reputation">
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-reputation">View Full Reputation Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
