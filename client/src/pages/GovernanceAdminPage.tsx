import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";
import { SectionHeader } from "@/components/ds/SectionHeader";
import { StatCard } from "@/components/ds/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Users, FileText, Clock, CheckCircle, XCircle,
  AlertTriangle, Database, Calendar, ChevronDown, ChevronUp,
  Lock, Eye, Download, Trash2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ConsentStat {
  type: string;
  label: string;
  granted: number;
  revoked: number;
  total: number;
  grantRate: number;
}

interface GovernanceUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  consentSummary: {
    totalConsents: number;
    granted: number;
    revoked: number;
    types: string[];
    lastUpdated: string | null;
  };
  complianceStatus: "compliant" | "partial" | "non-compliant";
}

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  consentType: string;
  action: "CONSENT_GRANTED" | "CONSENT_REVOKED";
  ipAddress?: string;
  timestamp: string;
  version: string;
}

const COMPLIANCE_COLOR: Record<string, string> = {
  compliant:       "text-green-400 bg-green-950/50 border-green-600/30",
  partial:         "text-yellow-400 bg-yellow-950/50 border-yellow-600/30",
  "non-compliant": "text-red-400 bg-red-950/50 border-red-600/30",
};

// ── Consent Bar ────────────────────────────────────────────────────────────
function ConsentBar({ stat }: { stat: ConsentStat }) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{stat.label}</span>
        <span className={`text-sm font-black ${stat.grantRate >= 70 ? "text-green-400" : stat.grantRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
          {stat.grantRate}%
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
        <motion.div
          className={`h-full rounded-full ${stat.grantRate >= 70 ? "bg-green-500" : stat.grantRate >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${stat.grantRate}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" /> {stat.granted} granted</span>
        <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> {stat.revoked} revoked</span>
      </div>
    </div>
  );
}

// ── User Row ───────────────────────────────────────────────────────────────
function UserRow({ user }: { user: GovernanceUser }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-slate-300">{user.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{user.name}</span>
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 capitalize">{user.role}</Badge>
          </div>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COMPLIANCE_COLOR[user.complianceStatus]}`}>
            {user.complianceStatus}
          </span>
          <button onClick={() => setOpen(o => !o)} className="p-1 text-slate-500 hover:text-slate-300">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-slate-800 p-2 text-center">
                  <div className="font-bold text-white">{user.consentSummary.granted}</div>
                  <div className="text-slate-500">Granted</div>
                </div>
                <div className="rounded-lg bg-slate-800 p-2 text-center">
                  <div className="font-bold text-white">{user.consentSummary.revoked}</div>
                  <div className="text-slate-500">Revoked</div>
                </div>
                <div className="rounded-lg bg-slate-800 p-2 text-center">
                  <div className="font-bold text-white">{user.consentSummary.totalConsents}</div>
                  <div className="text-slate-500">Total Events</div>
                </div>
              </div>
              {user.consentSummary.types.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {user.consentSummary.types.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-950/50 border border-blue-600/30 text-blue-300">
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
              {user.consentSummary.lastUpdated && (
                <p className="text-xs text-slate-600">Last updated: {new Date(user.consentSummary.lastUpdated).toLocaleString()}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Audit Log Row ──────────────────────────────────────────────────────────
function AuditRow({ entry }: { entry: AuditEntry }) {
  const granted = entry.action === "CONSENT_GRANTED";
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${granted ? "bg-green-950/60 border border-green-600/30" : "bg-red-950/60 border border-red-600/30"}`}>
        {granted ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{entry.userName}</span>
          <span className={`text-xs font-semibold ${granted ? "text-green-400" : "text-red-400"}`}>
            {granted ? "granted" : "revoked"}
          </span>
          <span className="text-xs text-slate-400">{entry.consentType.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
          {entry.ipAddress && <span>{entry.ipAddress}</span>}
          <span>v{entry.version}</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 shrink-0">{new Date(entry.timestamp).toLocaleString()}</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GovernanceAdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit" | "retention">("overview");

  const { data: complianceSummary } = useQuery({
    queryKey: ["governance-admin-compliance"],
    queryFn: () => apiRequest("/api/governance-admin/compliance-summary"),
    refetchInterval: 60_000,
  });

  const { data: consentStatsData } = useQuery({
    queryKey: ["governance-admin-consent-stats"],
    queryFn: () => apiRequest("/api/governance-admin/consent-stats"),
    refetchInterval: 60_000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["governance-admin-users"],
    queryFn: () => apiRequest("/api/governance-admin/users?limit=50"),
    enabled: activeTab === "users",
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["governance-admin-audit"],
    queryFn: () => apiRequest("/api/governance-admin/audit-log?limit=100"),
    enabled: activeTab === "audit",
  });

  const { data: retentionData } = useQuery({
    queryKey: ["governance-admin-retention"],
    queryFn: () => apiRequest("/api/governance-admin/retention-policies"),
    enabled: activeTab === "retention",
  });

  const cs = complianceSummary ?? {};
  const consentStats: ConsentStat[] = consentStatsData?.stats ?? [];
  const users: GovernanceUser[] = usersData?.users ?? [];
  const auditLog: AuditEntry[] = auditData?.log ?? [];
  const retentionPolicies = retentionData?.policies ?? [];

  const TABS = [
    { id: "overview",  label: "Overview",   icon: ShieldCheck },
    { id: "users",     label: "Users",      icon: Users       },
    { id: "audit",     label: "Audit Log",  icon: FileText    },
    { id: "retention", label: "Retention",  icon: Database    },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <SectionHeader
          title="Data Governance"
          description="Enterprise-level compliance, user consent management, and data audit trail — GDPR Article 30 compliant"
        />

        {/* Compliance KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"      value={cs.totalUsers ?? 0}                           icon={Users}       />
          <StatCard label="Consent Coverage" value={`${cs.gdprScore ?? 0}%`}                      icon={ShieldCheck} positive />
          <StatCard label="Consent Grants"   value={cs.totalConsentGrants ?? 0}                   icon={CheckCircle} positive />
          <StatCard label="DSRs Completed"   value={cs.dataSubjectRequests?.completed ?? 0}       icon={FileText}    />
        </div>

        {/* Certifications ribbon */}
        {cs.certifications && (
          <div className="flex flex-wrap gap-2">
            {cs.certifications.map((c: string) => (
              <div key={c} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-600/30 bg-emerald-950/30 text-emerald-300">
                <CheckCircle className="w-3 h-3" /> {c}
              </div>
            ))}
            {cs.lastAudit && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-slate-600/30 bg-slate-800/30 text-slate-400">
                <Calendar className="w-3 h-3" /> Last audit: {new Date(cs.lastAudit).toLocaleDateString()}
              </div>
            )}
            {cs.nextAuditDue && (
              <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-blue-600/30 bg-blue-950/30 text-blue-300">
                <Clock className="w-3 h-3" /> Next audit: {new Date(cs.nextAuditDue).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/60 rounded-xl p-1 border border-slate-700/40 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consentStats.map(stat => <ConsentBar key={stat.type} stat={stat} />)}
                </div>

                {/* Consent grant rate chart */}
                {consentStats.length > 0 && (
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
                    <h3 className="text-sm font-bold text-white mb-4">Consent Grant Rates by Category</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={consentStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#64748b", fontSize: 10 }}
                          axisLine={false} tickLine={false}
                          tickFormatter={(l: string) => l.split(" ").slice(0, 2).join(" ")}
                        />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                        <Tooltip
                          content={({ active, payload }: any) =>
                            active && payload?.[0] ? (
                              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs">
                                <p className="font-semibold text-white mb-1">{payload[0].payload.label}</p>
                                <p className="text-green-400">Grant rate: {payload[0].value}%</p>
                                <p className="text-slate-400">{payload[0].payload.granted} granted / {payload[0].payload.revoked} revoked</p>
                              </div>
                            ) : null
                          }
                        />
                        <Bar dataKey="grantRate" name="Grant Rate" radius={[4, 4, 0, 0]}>
                          {consentStats.map(s => (
                            <Cell key={s.type} fill={s.grantRate >= 70 ? "#22c55e" : s.grantRate >= 40 ? "#eab308" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Users */}
            {activeTab === "users" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">User Consent Overview ({users.length} users)</h3>
                </div>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse" />
                  ))
                ) : users.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">No user data</div>
                ) : (
                  users.map(u => <UserRow key={u.id} user={u} />)
                )}
              </div>
            )}

            {/* Audit Log */}
            {activeTab === "audit" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Consent Audit Trail ({auditLog.length} events, last 30 days)</h3>
                </div>
                {auditLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-pulse" />
                  ))
                ) : auditLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FileText className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500">No audit events yet</p>
                    <p className="text-xs text-slate-600 mt-1">Consent grants and revocations will appear here</p>
                  </div>
                ) : (
                  auditLog.map(entry => <AuditRow key={entry.id} entry={entry} />)
                )}
              </div>
            )}

            {/* Retention Policies */}
            {activeTab === "retention" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 mb-4">
                  <p className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Data Retention Policies (GDPR Article 5(1)(e))
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Data must not be kept longer than necessary. Policies below are reviewed annually and comply with applicable law.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {retentionPolicies.map((p: any) => (
                    <div key={p.category} className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-semibold text-white">{p.category}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${p.deletable ? "text-yellow-400 bg-yellow-950/50 border-yellow-600/30" : "text-slate-400 bg-slate-800 border-slate-600"}`}>
                          {p.deletable ? "erasable" : "preserved"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-white">{p.retentionDays} days</span>
                        <span className="text-slate-500">({Math.round(p.retentionDays / 365 * 10) / 10} years)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">{p.basis}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
