import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield, Users, Building2, ShieldCheck, FileText, Settings,
  AlertTriangle, CheckCircle, XCircle, TrendingDown, Eye,
  Globe, Mail, Phone, PlusCircle, Clock, Database,
  ChevronDown, ChevronUp, Lock, Calendar, UserCheck,
  BarChart3, Sliders, Activity,
} from "lucide-react";
import type { User } from "@shared/schema";

// ─── shared types ─────────────────────────────────────────────────────────────

interface BehavioralProfile {
  userId: string;
  submissionRate: number;
  avgTimeBetweenReports: number;
  locationConsistency: number;
  falseReportRate: number;
  anomalyScore: number;
  anomalyFlags: string[];
  trustBadge: "unverified" | "trusted" | "verified_responder" | "elite_responder";
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface Organization {
  id: string; name: string; type: string; description?: string;
  contactEmail?: string; contactPhone?: string; website?: string;
  region?: string; isVerified: boolean; isActive: boolean; createdAt: string;
}

interface ConsentStat {
  type: string; label: string; granted: number; revoked: number;
  total: number; grantRate: number;
}

interface GovernanceUser {
  id: string; name: string; email: string; role: string; createdAt: string;
  consentSummary: { totalConsents: number; granted: number; revoked: number; types: string[]; lastUpdated: string | null };
  complianceStatus: "compliant" | "partial" | "non-compliant";
}

interface AuditEntry {
  id: string; userId: string; userName: string; userEmail: string;
  consentType: string; action: "CONSENT_GRANTED" | "CONSENT_REVOKED";
  ipAddress?: string; timestamp: string; version: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const TRUST_BADGE: Record<string, { label: string; color: string }> = {
  elite_responder:    { label: "Elite Responder",    color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  verified_responder: { label: "Verified Responder", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  trusted:            { label: "Trusted",            color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  unverified:         { label: "Unverified",         color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const ORG_TYPE_COLORS: Record<string, string> = {
  ngo: "bg-green-100 text-green-800", government: "bg-blue-100 text-blue-800",
  private: "bg-purple-100 text-purple-800", military: "bg-red-100 text-red-800",
  un_agency: "bg-orange-100 text-orange-800",
};

const COMPLIANCE_COLOR: Record<string, string> = {
  compliant:       "text-green-400 bg-green-950/50 border-green-600/30",
  partial:         "text-yellow-400 bg-yellow-950/50 border-yellow-600/30",
  "non-compliant": "text-red-400 bg-red-950/50 border-red-600/30",
};

// ─── small sub-components ─────────────────────────────────────────────────────

function StatPill({ label, value, color, bg, icon: Icon }: any) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-background p-12 text-center">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="font-semibold">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ─── USERS tab ────────────────────────────────────────────────────────────────

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest(`/api/admin/users/${userId}/role`, { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated successfully" });
      setRoleDialogOpen(false); setSelectedUser(null);
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  if (!isAdmin) return (
    <EmptyState icon={Shield} title="Admin access required" sub="Only admins can manage users." />
  );
  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (allUsers.length === 0) return <EmptyState icon={Users} title="No users found" />;

  return (
    <>
      <div className="space-y-2">
        {allUsers.map((usr) => (
          <div key={usr.id} className="rounded-2xl border bg-background p-4 shadow-sm flex items-center justify-between gap-4" data-testid={`user-card-${usr.id}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                {(usr.name || usr.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm">{usr.name || "—"}</p>
                <p className="text-xs text-muted-foreground">{usr.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize">{usr.role || "citizen"}</Badge>
              <div className="flex gap-1.5">
                {usr.emailVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300">✓ Email</span>}
                {(usr as any).phoneVerified && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300">✓ Phone</span>}
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => { setSelectedUser(usr); setNewRole(usr.role || "citizen"); setRoleDialogOpen(true); }}>
                Change Role
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Role — {selectedUser?.name || selectedUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["citizen","volunteer","ngo","government","authority","admin"].map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => selectedUser && updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole })} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "Saving..." : "Update Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── ORGANIZATIONS tab ────────────────────────────────────────────────────────

function OrganizationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "ngo", description: "", contactEmail: "", contactPhone: "", website: "", region: "" });

  const { data, isLoading } = useQuery<{ organizations: Organization[]; total: number }>({ queryKey: ["/api/organizations"] });
  const { data: myMemberships } = useQuery<{ memberships: any[] }>({ queryKey: ["/api/organizations/me/memberships"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("/api/organizations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/me/memberships"] });
      setIsCreateOpen(false);
      setForm({ name: "", type: "ngo", description: "", contactEmail: "", contactPhone: "", website: "", region: "" });
      toast({ title: "Organization created successfully" });
    },
    onError: () => toast({ title: "Failed to create organization", variant: "destructive" }),
  });

  const orgs = data?.organizations || [];
  const memberships = myMemberships?.memberships || [];

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-3 flex-1 mr-4">
          {[
            { label: "Total", value: orgs.length, icon: Building2, bg: "bg-blue-500/10", color: "text-blue-500" },
            { label: "Verified", value: orgs.filter(o => o.isVerified).length, icon: CheckCircle, bg: "bg-green-500/10", color: "text-green-500" },
            { label: "Active", value: orgs.filter(o => o.isActive).length, icon: Globe, bg: "bg-purple-500/10", color: "text-purple-500" },
            { label: "My Memberships", value: memberships.length, icon: Users, bg: "bg-orange-500/10", color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, bg, color }) => (
            <div key={label} className="rounded-xl border bg-background p-3 shadow-sm flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div><p className={`text-xl font-black ${color}`}>{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
            </div>
          ))}
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusCircle className="w-4 h-4 mr-2" />New Org</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Red Cross District" /></div>
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ngo","government","private","military","un_agency"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ").toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact Email</Label><Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
                <div><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" /></div>
                <div><Label>Region</Label><Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="South Asia" /></div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Memberships */}
      {memberships.length > 0 && (
        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          <p className="font-bold text-sm mb-3">My Memberships</p>
          <div className="flex flex-wrap gap-2">
            {memberships.map((m) => (
              <span key={m.orgId} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 font-medium">
                <Building2 className="w-3 h-3" />{m.orgName}<span className="opacity-70">({m.memberRole})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Org list */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading organizations…</div>
      ) : orgs.length === 0 ? (
        <EmptyState icon={Building2} title="No organizations yet" sub="Create one using the button above." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-2xl border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-1 bg-blue-600" />
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="font-bold text-sm">{org.name}</h3>
                  {org.isVerified && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORG_TYPE_COLORS[org.type] || "bg-gray-100 text-gray-700"}`}>{org.type.replace("_"," ").toUpperCase()}</span>
                  {!org.isActive && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Inactive</span>}
                </div>
                {org.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{org.description}</p>}
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {org.region && <div className="flex items-center gap-1"><Globe className="w-3 h-3" />{org.region}</div>}
                  {org.contactEmail && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{org.contactEmail}</div>}
                  {org.contactPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{org.contactPhone}</div>}
                  <div className="text-muted-foreground/50 pt-1">Created {new Date(org.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GOVERNANCE tab ───────────────────────────────────────────────────────────

function GovernanceTab() {
  const { data: cs } = useQuery({
    queryKey: ["governance-admin-compliance"],
    queryFn: () => apiRequest("/api/governance-admin/compliance-summary"),
    refetchInterval: 60_000,
  });
  const { data: csd } = useQuery({
    queryKey: ["governance-admin-consent-stats"],
    queryFn: () => apiRequest("/api/governance-admin/consent-stats"),
    refetchInterval: 60_000,
  });
  const { data: retentionData } = useQuery({
    queryKey: ["governance-admin-retention"],
    queryFn: () => apiRequest("/api/governance-admin/retention-policies"),
  });

  const summary = cs ?? {};
  const consentStats: ConsentStat[] = csd?.stats ?? [];
  const retentionPolicies = retentionData?.policies ?? [];

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Users",       value: summary.totalUsers ?? 0,                         icon: Users,       color: "text-blue-500",  bg: "bg-blue-500/10"  },
          { label: "GDPR Score",        value: `${summary.gdprScore ?? 0}%`,                    icon: ShieldCheck, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Consent Grants",    value: summary.totalConsentGrants ?? 0,                 icon: CheckCircle, color: "text-purple-500",bg: "bg-purple-500/10"},
          { label: "DSRs Completed",    value: summary.dataSubjectRequests?.completed ?? 0,     icon: FileText,    color: "text-orange-500",bg: "bg-orange-500/10"},
        ].map(p => <StatPill key={p.label} {...p} />)}
      </div>

      {/* Certifications */}
      {summary.certifications && (
        <div className="flex flex-wrap gap-2">
          {summary.certifications.map((c: string) => (
            <div key={c} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-950/20 text-emerald-600 dark:text-emerald-300">
              <CheckCircle className="w-3 h-3" />{c}
            </div>
          ))}
          {summary.lastAudit && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border text-muted-foreground">
              <Calendar className="w-3 h-3" />Last audit: {new Date(summary.lastAudit).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Consent bars */}
      {consentStats.length > 0 && (
        <div className="space-y-3">
          <p className="font-bold text-sm">Consent Grant Rates</p>
          <div className="grid md:grid-cols-2 gap-3">
            {consentStats.map(stat => (
              <div key={stat.type} className="p-4 rounded-xl border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{stat.label}</span>
                  <span className={`text-sm font-black ${stat.grantRate >= 70 ? "text-green-500" : stat.grantRate >= 40 ? "text-yellow-500" : "text-red-500"}`}>{stat.grantRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${stat.grantRate >= 70 ? "bg-green-500" : stat.grantRate >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${stat.grantRate}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-3 h-3" />{stat.granted} granted</span>
                  <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" />{stat.revoked} revoked</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border bg-background p-5">
            <p className="font-bold text-sm mb-4">Consent Grant Rates by Category</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={consentStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(l: string) => l.split(" ").slice(0, 2).join(" ")} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={({ active, payload }: any) => active && payload?.[0] ? (
                  <div className="bg-background border rounded-xl px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold mb-1">{payload[0].payload.label}</p>
                    <p>Grant rate: {payload[0].value}%</p>
                  </div>
                ) : null} />
                <Bar dataKey="grantRate" radius={[4, 4, 0, 0]}>
                  {consentStats.map(s => <Cell key={s.type} fill={s.grantRate >= 70 ? "#22c55e" : s.grantRate >= 40 ? "#eab308" : "#ef4444"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Retention policies */}
      {retentionPolicies.length > 0 && (
        <div className="space-y-3">
          <Alert>
            <Lock className="w-4 h-4" />
            <AlertDescription className="text-xs">Data Retention Policies (GDPR Article 5(1)(e)) — reviewed annually.</AlertDescription>
          </Alert>
          <div className="grid md:grid-cols-2 gap-3">
            {retentionPolicies.map((p: any) => (
              <div key={p.category} className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{p.category}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${p.deletable ? "text-yellow-600 border-yellow-300 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:bg-yellow-950/30" : "text-muted-foreground border-border"}`}>
                    {p.deletable ? "erasable" : "preserved"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold">{p.retentionDays} days</span>
                  <span className="text-muted-foreground">({Math.round(p.retentionDays / 365 * 10) / 10} yrs)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.basis}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FRAUD tab ────────────────────────────────────────────────────────────────

function FraudTab() {
  const { data: anomalies } = useQuery<any>({ queryKey: ["/api/trust/anomalies"], refetchInterval: 60_000 });
  const { data: highRisk } = useQuery<{ highRiskUsers: BehavioralProfile[]; total: number }>({ queryKey: ["/api/trust/high-risk-users"] });

  const anomalyList = anomalies?.anomalies ?? [];
  const riskUsers = highRisk?.highRiskUsers ?? [];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Anomalies", value: anomalyList.length,                                              icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-500/10"    },
          { label: "High-Risk Users",  value: highRisk?.total ?? 0,                                           icon: TrendingDown,  color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Critical Users",   value: riskUsers.filter(u => u.riskLevel === "critical").length,       icon: Eye,           color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Last Check",       value: anomalies?.checkedAt ? formatDistanceToNow(new Date(anomalies.checkedAt), { addSuffix: true }) : "—", icon: Shield, color: "text-green-500", bg: "bg-green-500/10" },
        ].map(p => (
          <div key={p.label} className="rounded-xl border bg-background p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${p.bg} flex items-center justify-center mb-2.5`}>
              <p.icon className={`w-4 h-4 ${p.color}`} />
            </div>
            <p className="text-xs text-muted-foreground">{p.label}</p>
            <p className={`font-black mt-0.5 ${typeof p.value === "number" ? "text-2xl" : "text-sm"} ${p.color}`}>{p.value}</p>
          </div>
        ))}
      </div>

      {/* Anomalies */}
      <div>
        <p className="font-bold text-sm mb-3">
          System Anomalies
          {anomalyList.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-bold">{anomalyList.length}</span>}
        </p>
        {anomalyList.length === 0 ? (
          <div className="rounded-2xl border bg-background p-8 text-center">
            <Shield className="w-10 h-10 text-green-500 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-green-600">No anomalies detected</p>
            <p className="text-xs text-muted-foreground mt-1">System operating normally</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anomalyList.map((a: any, i: number) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-4">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
                <div className="flex justify-between items-start pl-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <p className="font-bold text-sm text-yellow-700 dark:text-yellow-400">{a.type?.replace(/_/g, " ").toUpperCase()}</p>
                    </div>
                    <p className="text-sm">{a.description}</p>
                    {a.affectedArea && <p className="text-xs text-muted-foreground mt-1">Area: {a.affectedArea}</p>}
                  </div>
                  <div className="text-right text-xs shrink-0 ml-4">
                    <p className="font-bold">{a.reportCount} reports</p>
                    <p className="text-muted-foreground">in {a.timeWindowMinutes}min</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High-risk users */}
      <div>
        <p className="font-bold text-sm mb-3">
          High-Risk Users
          {(highRisk?.total ?? 0) > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">{highRisk?.total}</span>}
        </p>
        {riskUsers.length === 0 ? (
          <div className="rounded-2xl border bg-background p-8 text-center">
            <UserCheck className="w-10 h-10 text-green-500 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-green-600">No high-risk users</p>
            <p className="text-xs text-muted-foreground mt-1">All users within normal behavioral patterns</p>
          </div>
        ) : (
          <div className="space-y-3">
            {riskUsers.map((u, i) => {
              const badge = TRUST_BADGE[u.trustBadge];
              return (
                <div key={i} className={`rounded-2xl border bg-background p-4 shadow-sm ${u.riskLevel === "critical" ? "border-red-300 dark:border-red-700" : ""}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{u.userId.slice(0, 8)}…</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>{badge.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                      u.riskLevel === "critical" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                      u.riskLevel === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" : "bg-muted text-muted-foreground"
                    }`}>{u.riskLevel} risk</span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Anomaly Score</span>
                      <span className={`font-black ${u.anomalyScore > 70 ? "text-red-600" : u.anomalyScore > 40 ? "text-yellow-600" : "text-green-600"}`}>{u.anomalyScore}/100</span>
                    </div>
                    <Progress value={u.anomalyScore} className={u.anomalyScore > 70 ? "[&>div]:bg-red-500" : u.anomalyScore > 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                    {[
                      { label: "Submissions/24h", value: u.submissionRate },
                      { label: "False Rate", value: `${Math.round(u.falseReportRate * 100)}%` },
                      { label: "Location Consistency", value: `${u.locationConsistency}%` },
                      { label: "Avg time between", value: `${u.avgTimeBetweenReports}min` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/50 rounded-lg p-2">
                        <p className="text-muted-foreground text-xs">{label}</p>
                        <p className="font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                  {u.anomalyFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {u.anomalyFlags.map((flag, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full border border-red-300 text-red-600 dark:text-red-400">{flag.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AUDIT tab ────────────────────────────────────────────────────────────────

function AuditTab() {
  const { data: auditData, isLoading } = useQuery({
    queryKey: ["governance-admin-audit"],
    queryFn: () => apiRequest("/api/governance-admin/audit-log?limit=100"),
  });
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["governance-admin-users"],
    queryFn: () => apiRequest("/api/governance-admin/users?limit=50"),
  });

  const auditLog: AuditEntry[] = auditData?.log ?? [];
  const users: GovernanceUser[] = usersData?.users ?? [];

  return (
    <div className="space-y-6">
      {/* User consent overview */}
      <div>
        <p className="font-bold text-sm mb-3">User Consent Overview ({users.length} users)</p>
        {usersLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl border bg-muted/30 animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No user data" />
        ) : (
          <div className="space-y-2">
            {users.map(u => <GovernanceUserRow key={u.id} user={u} />)}
          </div>
        )}
      </div>

      {/* Audit log */}
      <div>
        <p className="font-bold text-sm mb-3">Consent Audit Trail ({auditLog.length} events)</p>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-xl border bg-muted/30 animate-pulse" />)}</div>
        ) : auditLog.length === 0 ? (
          <EmptyState icon={FileText} title="No audit events yet" sub="Consent grants and revocations will appear here." />
        ) : (
          <div className="space-y-2">
            {auditLog.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl border bg-background">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${entry.action === "CONSENT_GRANTED" ? "bg-green-50 border border-green-200 dark:bg-green-950/60 dark:border-green-600/30" : "bg-red-50 border border-red-200 dark:bg-red-950/60 dark:border-red-600/30"}`}>
                  {entry.action === "CONSENT_GRANTED"
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{entry.userName}</span>
                    <span className={`text-xs font-semibold ${entry.action === "CONSENT_GRANTED" ? "text-green-500" : "text-red-500"}`}>
                      {entry.action === "CONSENT_GRANTED" ? "granted" : "revoked"}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.consentType.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {entry.ipAddress && <span>{entry.ipAddress}</span>}
                    <span>v{entry.version}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GovernanceUserRow({ user }: { user: GovernanceUser }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-sm font-bold">{user.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{user.name}</span>
            <Badge variant="outline" className="text-xs capitalize">{user.role}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COMPLIANCE_COLOR[user.complianceStatus]}`}>{user.complianceStatus}</span>
          <button onClick={() => setOpen(o => !o)} className="p-1 text-muted-foreground hover:text-foreground">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t p-3 space-y-2 bg-muted/20">
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[["Granted", user.consentSummary.granted], ["Revoked", user.consentSummary.revoked], ["Total Events", user.consentSummary.totalConsents]].map(([l, v]) => (
              <div key={String(l)} className="rounded-lg bg-muted p-2 text-center">
                <div className="font-bold">{v}</div><div className="text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          {user.consentSummary.types.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {user.consentSummary.types.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-600/30 dark:text-blue-300">{t.replace(/_/g, " ")}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [simulationMode, setSimulationMode] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const settings = [
    { key: "rateLimitEnabled", label: "API Rate Limiting", desc: "Enforce per-IP request limits across all API endpoints", icon: Shield, value: rateLimitEnabled, set: setRateLimitEnabled },
    { key: "aiEnabled", label: "AI Analysis Pipeline", desc: "Enable background AI validation and scoring of incoming reports", icon: Activity, value: aiEnabled, set: setAiEnabled },
    { key: "simulationMode", label: "Simulation Mode", desc: "Run disaster simulations and test scenarios without affecting live data", icon: Sliders, value: simulationMode, set: setSimulationMode },
    { key: "maintenanceMode", label: "Maintenance Mode", desc: "Take the platform offline for all non-admin users during upgrades", icon: Settings, value: maintenanceMode, set: setMaintenanceMode, danger: true },
  ];

  return (
    <div className="space-y-5">
      {maintenanceMode && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Maintenance mode is active — non-admin users cannot access the platform.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <p className="font-bold text-sm">Platform Feature Flags</p>
        {settings.map(({ key, label, desc, icon: Icon, value, set, danger }) => (
          <div key={key} className={`rounded-2xl border bg-background p-4 shadow-sm flex items-start justify-between gap-4 ${danger && value ? "border-destructive/40" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-500/10" : "bg-muted"}`}>
                <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
            <Switch checked={value} onCheckedChange={set} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm space-y-4">
        <p className="font-bold text-sm">Rate Limit Configuration</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs">Window (ms)</Label><Input defaultValue="900000" className="mt-1" /></div>
          <div><Label className="text-xs">Max Requests / Window</Label><Input defaultValue="100" className="mt-1" /></div>
          <div><Label className="text-xs">Default Page Size</Label><Input defaultValue="20" className="mt-1" /></div>
          <div><Label className="text-xs">Max Page Size</Label><Input defaultValue="100" className="mt-1" /></div>
        </div>
        <Button variant="outline" size="sm">Save Configuration</Button>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm space-y-3">
        <p className="font-bold text-sm">System Information</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            { label: "Environment", value: import.meta.env.MODE },
            { label: "API Version", value: "v1" },
            { label: "Auth Method", value: "JWT (RS256)" },
            { label: "Database", value: "PostgreSQL" },
            { label: "PubSub", value: "In-Memory" },
            { label: "AI Pipeline", value: aiEnabled ? "Active" : "Disabled" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">{label}</p>
              <p className="font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AdminConsolePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAuthorized = user?.role === "admin" || user?.role === "ngo";

  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get("tab") || "users";

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-2xl border bg-background p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-black mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground">This console is only accessible to Admin and NGO users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <h1 className="text-2xl font-black">Admin Console</h1>
          </div>
          <p className="text-sm text-muted-foreground">Users · Organizations · Governance · Fraud detection · Audit trail · Platform settings</p>
        </div>
        <div className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium capitalize bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
          {user?.role} access
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="users" className="text-xs"><Users className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Users</TabsTrigger>
          <TabsTrigger value="organizations" className="text-xs"><Building2 className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Organizations</TabsTrigger>
          <TabsTrigger value="governance" className="text-xs"><ShieldCheck className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Governance</TabsTrigger>
          <TabsTrigger value="fraud" className="text-xs"><AlertTriangle className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Fraud</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Audit</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs"><Settings className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users"         className="mt-5"><UsersTab isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="organizations" className="mt-5"><OrganizationsTab /></TabsContent>
        <TabsContent value="governance"    className="mt-5"><GovernanceTab /></TabsContent>
        <TabsContent value="fraud"         className="mt-5"><FraudTab /></TabsContent>
        <TabsContent value="audit"         className="mt-5"><AuditTab /></TabsContent>
        <TabsContent value="settings"      className="mt-5"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
