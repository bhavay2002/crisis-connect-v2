import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  UserCircle, Settings, Shield, Mail, Phone, CreditCard,
  CheckCircle2, XCircle, Clock, Award, Send, AlertCircle,
  TrendingUp, ThumbsUp, Package, Target, Trophy, Heart,
  ShieldCheck, Download, Trash2, FileText, Lock, AlertTriangle,
  CheckCircle,
} from "lucide-react";
import type { UserReputation } from "@shared/schema";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "admin": return "destructive" as const;
    case "government": return "default" as const;
    case "ngo": return "secondary" as const;
    default: return "outline" as const;
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "government": return "Government Official";
    case "ngo": return "NGO/Organization";
    case "volunteer": return "Volunteer";
    case "admin": return "Admin";
    default: return "Citizen";
  }
}

function getTrustLevel(score: number) {
  if (score >= 80) return { label: "Excellent", color: "text-green-600" };
  if (score >= 60) return { label: "Good", color: "text-blue-600" };
  if (score >= 40) return { label: "Fair", color: "text-yellow-600" };
  return { label: "Building", color: "text-orange-600" };
}

// ─── consent types ────────────────────────────────────────────────────────────

interface Consent {
  id: string;
  consentType: string;
  granted: boolean;
  grantedAt: string;
  version: string;
}

interface RetentionPolicy {
  policyVersion: string;
  lastReviewed: string;
  retentionRules: { dataType: string; retainDays: number | null; anonymizeAfterDays: number | null; legalBasis: string }[];
  userRights: string[];
  dpa: string;
}

const consentLabels: Record<string, string> = {
  data_processing: "Data Processing",
  location_tracking: "Location Tracking",
  analytics: "Analytics & Insights",
  marketing: "Marketing Communications",
  third_party_sharing: "Third-Party Data Sharing",
};

const consentDescriptions: Record<string, string> = {
  data_processing: "Processing your personal data to operate CrisisConnect services",
  location_tracking: "Using your location to route emergency services and alerts",
  analytics: "Anonymized usage analytics to improve platform performance",
  marketing: "Receiving updates, newsletters, and product announcements",
  third_party_sharing: "Sharing anonymized data with government agencies and research partners",
};

// ─── main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get("tab") || "identity";

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border-2 border-dashed py-16 text-center max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
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
          <p className="text-sm text-muted-foreground">Manage your account, verification and privacy settings</p>
        </div>
        <Link href="/select-role">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />Change Role
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="reputation">Reputation</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* ── IDENTITY TAB ── */}
        <TabsContent value="identity" className="space-y-4 mt-4">
          <IdentityTab user={user} />
        </TabsContent>

        {/* ── VERIFICATION TAB ── */}
        <TabsContent value="verification" className="space-y-4 mt-4">
          <VerificationTab user={user} />
        </TabsContent>

        {/* ── REPUTATION TAB ── */}
        <TabsContent value="reputation" className="space-y-4 mt-4">
          <ReputationTab user={user} />
        </TabsContent>

        {/* ── PRIVACY TAB ── */}
        <TabsContent value="privacy" className="space-y-4 mt-4">
          <PrivacyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── IDENTITY TAB ─────────────────────────────────────────────────────────────

function IdentityTab({ user }: { user: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Account info */}
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

      {/* Verification status summary */}
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
              {verified
                ? <CheckCircle2 className="h-4 w-4 text-green-500" data-testid={testIdTrue} />
                : <XCircle className="h-4 w-4 text-muted-foreground" data-testid={testIdFalse} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VERIFICATION TAB ─────────────────────────────────────────────────────────

function VerificationTab({ user }: { user: any }) {
  const { toast } = useToast();
  const [emailCode, setEmailCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [phoneOTPSent, setPhoneOTPSent] = useState(false);
  const [devOTP, setDevOTP] = useState("");

  const sendEmailMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/send-email-verification", { method: "POST" }),
    onSuccess: (data: any) => {
      setEmailOTPSent(true);
      if (data.devOTP) setDevOTP(data.devOTP);
      toast({ title: "Verification Code Sent", description: "Check your email for the verification code." });
    },
    onError: (error: any) => toast({ title: "Failed to Send Code", description: error.message || "Please try again later.", variant: "destructive" }),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ code: emailCode }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Email Verified", description: "Your email has been successfully verified!" });
      setEmailCode(""); setEmailOTPSent(false); setDevOTP("");
    },
    onError: (error: any) => toast({ title: "Verification Failed", description: error.message || "Invalid or expired code.", variant: "destructive" }),
  });

  const sendPhoneMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/send-phone-verification", { method: "POST", body: JSON.stringify({ phoneNumber }) }),
    onSuccess: (data: any) => {
      setPhoneOTPSent(true);
      if (data.devOTP) setDevOTP(data.devOTP);
      toast({ title: "Verification Code Sent", description: `Check your phone ${phoneNumber} for the code.` });
    },
    onError: (error: any) => toast({ title: "Failed to Send Code", description: error.message || "Please try again later.", variant: "destructive" }),
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/verify-phone", { method: "POST", body: JSON.stringify({ code: phoneCode, phoneNumber }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Phone Verified", description: "Your phone number has been successfully verified!" });
      setPhoneCode(""); setPhoneOTPSent(false); setPhoneNumber(""); setDevOTP("");
    },
    onError: (error: any) => toast({ title: "Verification Failed", description: error.message || "Invalid or expired code.", variant: "destructive" }),
  });

  const verifyAadhaarMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/verify-aadhaar", { method: "POST", body: JSON.stringify({ aadhaarNumber }) }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/reputation/me"] });
      toast({ title: "Aadhaar Verified", description: data.note || "Your Aadhaar has been successfully verified!" });
      setAadhaarNumber("");
    },
    onError: (error: any) => toast({ title: "Verification Failed", description: error.message || "Please check your Aadhaar number.", variant: "destructive" }),
  });

  const allVerified = user.emailVerified && user.phoneVerified && user.aadhaarVerified;

  return (
    <div className="space-y-4">
      {devOTP && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <strong>Development Mode:</strong> Your verification code is: <code className="font-mono font-bold">{devOTP}</code>
          </AlertDescription>
        </Alert>
      )}

      {allVerified ? (
        <div className="rounded-2xl border-2 border-green-500 bg-green-50/50 dark:bg-green-950/20 p-5" data-testid="card-all-verified">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-bold text-green-700 dark:text-green-400">All Verifications Complete!</h3>
              <p className="text-sm text-muted-foreground">Your trust score has been boosted. You have full platform access.</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Email */}
      {!user.emailVerified && (
        <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-email-verification">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Email Verification</h3>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {!emailOTPSent ? (
            <Button onClick={() => sendEmailMutation.mutate()} disabled={sendEmailMutation.isPending} className="w-full" data-testid="button-send-email-code">
              <Send className="h-4 w-4 mr-2" />
              {sendEmailMutation.isPending ? "Sending..." : "Send Verification Code"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="email-code">Enter Verification Code</Label>
                <Input id="email-code" type="text" placeholder="Enter 6-digit code" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} maxLength={6} data-testid="input-email-code" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => verifyEmailMutation.mutate()} disabled={!emailCode || verifyEmailMutation.isPending} className="flex-1" data-testid="button-verify-email">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {verifyEmailMutation.isPending ? "Verifying..." : "Verify Email"}
                </Button>
                <Button variant="outline" onClick={() => { setEmailOTPSent(false); setEmailCode(""); setDevOTP(""); }} data-testid="button-cancel-email">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phone */}
      {!user.phoneVerified && (
        <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-phone-verification">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Phone Verification</h3>
              <p className="text-xs text-muted-foreground">Verify your phone for enhanced security</p>
            </div>
          </div>
          {!phoneOTPSent ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input id="phone-number" type="tel" placeholder="+91 1234567890" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} data-testid="input-phone-number" />
              </div>
              <Button onClick={() => sendPhoneMutation.mutate()} disabled={!phoneNumber || sendPhoneMutation.isPending} className="w-full" data-testid="button-send-phone-code">
                <Send className="h-4 w-4 mr-2" />
                {sendPhoneMutation.isPending ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="phone-code">Enter Verification Code</Label>
                <Input id="phone-code" type="text" placeholder="Enter 6-digit code" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} maxLength={6} data-testid="input-phone-code" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => verifyPhoneMutation.mutate()} disabled={!phoneCode || verifyPhoneMutation.isPending} className="flex-1" data-testid="button-verify-phone">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {verifyPhoneMutation.isPending ? "Verifying..." : "Verify Phone"}
                </Button>
                <Button variant="outline" onClick={() => { setPhoneOTPSent(false); setPhoneCode(""); setDevOTP(""); }} data-testid="button-cancel-phone">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aadhaar */}
      {!user.aadhaarVerified && (
        <div className="rounded-2xl border bg-background p-5 shadow-sm" data-testid="card-aadhaar-verification">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Aadhaar Verification</h3>
              <p className="text-xs text-muted-foreground">Complete identity verification for full trust</p>
            </div>
          </div>
          <Alert className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode:</strong> Simulated verification. In production, integrates with UIDAI's official API.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            <div>
              <Label htmlFor="aadhaar-number">Aadhaar Number</Label>
              <Input id="aadhaar-number" type="text" placeholder="Enter 12-digit Aadhaar number" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))} maxLength={12} data-testid="input-aadhaar-number" />
              <p className="text-xs text-muted-foreground mt-1">For demo: Enter any 12-digit number</p>
            </div>
            <Button onClick={() => verifyAadhaarMutation.mutate()} disabled={aadhaarNumber.length !== 12 || verifyAadhaarMutation.isPending} className="w-full" data-testid="button-verify-aadhaar">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {verifyAadhaarMutation.isPending ? "Verifying..." : "Verify Aadhaar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPUTATION TAB ───────────────────────────────────────────────────────────

function ReputationTab({ user }: { user: any }) {
  const { data: reputation, isLoading } = useQuery<UserReputation>({
    queryKey: ["/api/reputation/me"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reputation) {
    return (
      <div className="rounded-2xl border-2 border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">No reputation data available yet</p>
      </div>
    );
  }

  const trustLevel = getTrustLevel(reputation.trustScore);

  const achievements = [
    { id: "verified_contributor", title: "Verified Contributor", description: "Complete identity verification", icon: Shield, unlocked: user.emailVerified && user.phoneVerified, progress: [user.emailVerified, user.phoneVerified, user.aadhaarVerified].filter(Boolean).length, total: 3 },
    { id: "report_master", title: "Report Master", description: "Submit 10 verified reports", icon: CheckCircle2, unlocked: reputation.verifiedReports >= 10, progress: reputation.verifiedReports, total: 10 },
    { id: "community_validator", title: "Community Validator", description: "Verify 25 reports", icon: ThumbsUp, unlocked: reputation.verificationsGiven >= 25, progress: reputation.verificationsGiven, total: 25 },
    { id: "helper", title: "Community Helper", description: "Provide 5 resources", icon: Package, unlocked: reputation.resourcesProvided >= 5, progress: reputation.resourcesProvided, total: 5 },
    { id: "trusted_reporter", title: "Trusted Reporter", description: "Reach 75+ trust score", icon: Trophy, unlocked: reputation.trustScore >= 75, progress: reputation.trustScore, total: 75 },
  ];

  return (
    <div className="space-y-4">
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
        <p className="text-xs text-muted-foreground mt-2">Complete verifications and contribute to increase your score</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Reports", value: reputation.totalReports, sub: `${reputation.verifiedReports} verified`, icon: Target, testId: "card-stat-reports", valTestId: "text-stat-total-reports", bg: "bg-blue-500/10", color: "text-blue-500" },
          { label: "Verifications Given", value: reputation.verificationsGiven, sub: "Helping validate reports", icon: CheckCircle2, testId: "card-stat-verifications", valTestId: "text-stat-verifications", bg: "bg-green-500/10", color: "text-green-500" },
          { label: "Upvotes Received", value: reputation.upvotesReceived, sub: "Community trust", icon: ThumbsUp, testId: "card-stat-upvotes", valTestId: "text-stat-upvotes", bg: "bg-purple-500/10", color: "text-purple-500" },
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
          {achievements.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.id} className={`p-4 rounded-xl border-2 ${a.unlocked ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`} data-testid={`achievement-${a.id}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full flex-shrink-0 ${a.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-sm">{a.title}</h4>
                      {a.unlocked && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span><span>{a.progress}/{a.total}</span>
                      </div>
                      <Progress value={Math.min((a.progress / a.total) * 100, 100)} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
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
    </div>
  );
}

// ─── PRIVACY TAB ──────────────────────────────────────────────────────────────

function PrivacyTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: consentsData } = useQuery<{ consents: Consent[] }>({ queryKey: ["/api/compliance/me/consents"] });
  const { data: retentionPolicy } = useQuery<RetentionPolicy>({ queryKey: ["/api/compliance/data-retention"] });

  const consentMutation = useMutation({
    mutationFn: ({ consentType, granted }: { consentType: string; granted: boolean }) =>
      apiRequest("/api/compliance/me/consent", { method: "POST", body: JSON.stringify({ consentType, granted }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/compliance/me/consents"] }); toast({ title: "Consent preference saved" }); },
    onError: () => toast({ title: "Failed to save preference", variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/compliance/me/export", { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "crisisconnect-my-data.json"; a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast({ title: "Data export downloaded" }),
    onError: () => toast({ title: "Export failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("/api/compliance/me/account", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE_MY_ACCOUNT" }) }),
    onSuccess: () => { toast({ title: "Account deleted. You will be logged out." }); setTimeout(() => { window.location.href = "/"; }, 2000); },
    onError: () => toast({ title: "Deletion failed", variant: "destructive" }),
  });

  const consents = consentsData?.consents || [];
  const latestConsents = Object.fromEntries(
    Object.keys(consentLabels).map(type => {
      const c = consents.filter(c => c.consentType === type).sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())[0];
      return [type, c?.granted ?? false];
    })
  );

  return (
    <div className="space-y-4">
      {/* Consent Management */}
      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          </div>
          <h3 className="font-bold text-sm">Consent Management</h3>
        </div>
        <p className="text-xs text-muted-foreground pl-9 mb-4">Control how CrisisConnect uses your personal data. Preferences are recorded with a timestamp.</p>
        <div className="space-y-3">
          {Object.entries(consentLabels).map(([type, label]) => (
            <div key={type} className="flex items-start justify-between gap-4 p-3 rounded-xl border bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`consent-${type}`} className="font-medium cursor-pointer text-sm">{label}</Label>
                  {latestConsents[type]
                    ? <Badge variant="default" className="text-xs bg-green-600">Granted</Badge>
                    : <Badge variant="secondary" className="text-xs">Not granted</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{consentDescriptions[type]}</p>
              </div>
              <Switch id={`consent-${type}`} checked={latestConsents[type]} onCheckedChange={(checked) => consentMutation.mutate({ consentType: type, granted: checked })} />
            </div>
          ))}
        </div>

        {consents.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Consent History</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {consents.slice(0, 20).map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {c.granted ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                    <span className="text-xs">{consentLabels[c.consentType] || c.consentType}</span>
                    <Badge variant="outline" className="text-xs">v{c.version}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.grantedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Download className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <h3 className="font-bold text-sm">Export Your Data</h3>
        </div>
        <p className="text-xs text-muted-foreground pl-9 mb-4">Download a complete copy of all data CrisisConnect holds about you, in JSON format.</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Profile & Account", desc: "Name, email, role, timestamps" },
            { label: "Disaster Reports", desc: "All reports you submitted" },
            { label: "SOS Alerts", desc: "Your emergency activations" },
            { label: "Resource Requests", desc: "Aid & resource requests" },
            { label: "Consent Records", desc: "All consent decisions" },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2 p-3 border rounded-xl bg-muted/30">
              <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Alert className="mb-3">
          <Lock className="w-4 h-4" />
          <AlertDescription>Export generated in real-time. Sensitive fields like passwords are excluded.</AlertDescription>
        </Alert>
        <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} className="w-full">
          <Download className="w-4 h-4 mr-2" />
          {exportMutation.isPending ? "Preparing export..." : "Download My Data (JSON)"}
        </Button>
      </div>

      {/* Data Retention */}
      {retentionPolicy && (
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Data Retention Policy</h3>
              <p className="text-xs text-muted-foreground">v{retentionPolicy.policyVersion} — Last reviewed {retentionPolicy.lastReviewed}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Data Type</th>
                  <th className="text-right py-2 font-medium">Retain (days)</th>
                  <th className="text-right py-2 font-medium">Anonymize</th>
                  <th className="text-left py-2 font-medium pl-4">Legal Basis</th>
                </tr>
              </thead>
              <tbody>
                {retentionPolicy.retentionRules.map(rule => (
                  <tr key={rule.dataType} className="border-b last:border-0">
                    <td className="py-2 font-medium">{rule.dataType.replace(/_/g, " ")}</td>
                    <td className="py-2 text-right">{rule.retainDays ?? "Until deleted"}</td>
                    <td className="py-2 text-right">{rule.anonymizeAfterDays ? `${rule.anonymizeAfterDays}d` : "—"}</td>
                    <td className="py-2 pl-4"><Badge variant="outline" className="text-xs">{rule.legalBasis.replace(/_/g, " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-medium mb-2">Your Rights</p>
            <div className="flex flex-wrap gap-1.5">
              {retentionPolicy.userRights.map(right => (
                <Badge key={right} variant="secondary" className="text-xs capitalize">{right}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Data Protection contact: {retentionPolicy.dpa}</p>
          </div>
        </div>
      )}

      {/* Delete Account */}
      <div className="rounded-2xl border border-destructive/40 bg-background p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </div>
          <h3 className="font-bold text-sm text-destructive">Delete My Account</h3>
        </div>
        <p className="text-xs text-muted-foreground pl-9 mb-4">Permanently delete your account and anonymize your submitted reports. This cannot be undone.</p>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Your profile, consents, and device records will be permanently deleted. Disaster reports will be anonymized and retained for public safety records.</AlertDescription>
        </Alert>
        {!showDeleteDialog ? (
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="w-4 h-4 mr-2" />Request Account Deletion
          </Button>
        ) : (
          <div className="space-y-3 p-4 border border-destructive/30 rounded-xl bg-destructive/5">
            <p className="text-sm font-medium">Type <code className="bg-muted px-1 rounded">DELETE_MY_ACCOUNT</code> to confirm:</p>
            <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono bg-background" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE_MY_ACCOUNT" />
            <div className="flex gap-2">
              <Button variant="destructive" disabled={deleteConfirm !== "DELETE_MY_ACCOUNT" || deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                {deleteMutation.isPending ? "Deleting..." : "Confirm Permanent Deletion"}
              </Button>
              <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
