import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { DisasterReport, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle, 
  Flag, 
  UserPlus, 
  Filter,
  Clock,
  MapPin,
  FileText,
  Shield,
  Users,
  TrendingUp
} from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<DisasterReport | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [flagType, setFlagType] = useState<string>("false_report");
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("");

  // Check if user is admin or NGO
  const isAuthorized = user?.role === "admin" || user?.role === "ngo";
  const isAdmin = user?.role === "admin";

  // Fetch all reports
  const { data: allReportsResponse, isLoading } = useQuery<{ data: DisasterReport[]; pagination: any }>({
    queryKey: ["/api/reports"],
  });
  
  const allReports = allReportsResponse?.data || [];

  // Fetch prioritized reports
  const { data: prioritizedReports = [] } = useQuery<DisasterReport[]>({
    queryKey: ["/api/admin/reports/prioritized"],
    enabled: isAuthorized,
  });

  // Fetch flagged reports
  const { data: flaggedReports = [] } = useQuery<DisasterReport[]>({
    queryKey: ["/api/admin/reports/flagged"],
    enabled: isAuthorized,
  });

  // Fetch assignable users for assignment
  const { data: assignableUsers = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/assignable-users"],
    enabled: isAuthorized,
  });

  // Fetch all users for management (admin only)
  const { data: allUsers = [], isLoading: isLoadingAllUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  // Flag report mutation
  const flagReportMutation = useMutation({
    mutationFn: async ({ reportId, flagType, notes }: { reportId: string; flagType: string; notes?: string }) => {
      return await apiRequest(`/api/admin/reports/${reportId}/flag`, {
        method: "POST",
        body: JSON.stringify({
          flagType,
          adminNotes: notes,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Report flagged",
        description: "The report has been flagged successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/flagged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/prioritized"] });
      setFlagDialogOpen(false);
      setSelectedReport(null);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to flag report",
        variant: "destructive",
      });
    },
  });

  // Assign report mutation
  const assignReportMutation = useMutation({
    mutationFn: async ({ reportId, volunteerId }: { reportId: string; volunteerId: string }) => {
      return await apiRequest(`/api/admin/reports/${reportId}/assign`, {
        method: "POST",
        body: JSON.stringify({
          volunteerId,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Report assigned",
        description: "The report has been assigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/prioritized"] });
      setAssignDialogOpen(false);
      setSelectedReport(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign report",
        variant: "destructive",
      });
    },
  });

  // Add notes mutation
  const addNotesMutation = useMutation({
    mutationFn: async ({ reportId, notes }: { reportId: string; notes: string }) => {
      return await apiRequest(`/api/admin/reports/${reportId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({
          notes,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes added",
        description: "Admin notes have been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setNotesDialogOpen(false);
      setSelectedReport(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add notes",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      return await apiRequest(`/api/reports/${reportId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Report status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/prioritized"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assignable-users"] });
      setRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/login");
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleFlagReport = () => {
    if (selectedReport) {
      flagReportMutation.mutate({
        reportId: selectedReport.id,
        flagType,
        notes: adminNotes,
      });
    }
  };

  const handleAssignReport = () => {
    if (selectedReport && selectedVolunteer) {
      assignReportMutation.mutate({
        reportId: selectedReport.id,
        volunteerId: selectedVolunteer,
      });
    }
  };

  const handleAddNotes = () => {
    if (selectedReport && adminNotes.trim()) {
      addNotesMutation.mutate({
        reportId: selectedReport.id,
        notes: adminNotes,
      });
    }
  };

  const handleUpdateUserRole = () => {
    if (selectedUser && newRole) {
      updateUserRoleMutation.mutate({
        userId: selectedUser.id,
        role: newRole,
      });
    }
  };

  // Filter reports based on active tab and status filter
  const getFilteredReports = () => {
    let reports = allReports;

    if (activeTab === "prioritized") {
      reports = prioritizedReports;
    } else if (activeTab === "flagged") {
      reports = flaggedReports;
    }

    if (statusFilter !== "all") {
      reports = reports.filter(r => r.status === statusFilter);
    }

    return reports;
  };

  const filteredReports = getFilteredReports();

  // Calculate stats
  const stats = {
    pending: allReports.filter(r => r.status === "reported").length,
    verified: allReports.filter(r => r.status === "verified").length,
    responding: allReports.filter(r => r.status === "responding").length,
    flagged: flaggedReports.length,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reported": return <Badge variant="outline">Pending</Badge>;
      case "verified": return <Badge className="bg-green-500 text-white">Verified</Badge>;
      case "responding": return <Badge className="bg-blue-500 text-white">Responding</Badge>;
      case "resolved": return <Badge className="bg-gray-500 text-white">Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAuthorized) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="rounded-2xl border bg-background p-8 max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-black mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground">This dashboard is only accessible to Admin and NGO users.</p>
          </div>
        </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading admin dashboard…</p>
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
              <h1 className="text-2xl font-black">Admin Command Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Disaster feed management, AI-prioritized triage, volunteer coordination, and user governance
            </p>
          </div>
          <div className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium capitalize
            bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
            {user?.role} access
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Pending",    value: stats.pending,    sub: "Awaiting verification", icon: Clock,        color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "Verified",   value: stats.verified,   sub: "Confirmed incidents",   icon: CheckCircle,  color: "text-green-500",  bg: "bg-green-500/10"  },
            { label: "Responding", value: stats.responding, sub: "Active response",        icon: Users,        color: "text-blue-500",   bg: "bg-blue-500/10"   },
            { label: "Flagged",    value: stats.flagged,    sub: "Needs review",           icon: Flag,         color: "text-red-500",    bg: "bg-red-500/10"    },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border bg-background p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reported">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="responding">Responding</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} shown</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs" data-testid="tab-all-reports">All Reports</TabsTrigger>
            <TabsTrigger value="prioritized" className="text-xs" data-testid="tab-prioritized">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />AI Prioritized
            </TabsTrigger>
            <TabsTrigger value="flagged" className="text-xs" data-testid="tab-flagged">
              <Flag className="w-3.5 h-3.5 mr-1.5" />Flagged
              {stats.flagged > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">{stats.flagged}</span>}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="text-xs" data-testid="tab-users">
                <Users className="w-3.5 h-3.5 mr-1.5" />User Management
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredReports.length === 0 ? (
              <div className="rounded-2xl border bg-background p-12 text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No reports to display</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <div key={report.id} className={`rounded-2xl border bg-background shadow-sm overflow-hidden ${report.flagType ? "border-red-300 dark:border-red-700" : ""}`} data-testid={`report-card-${report.id}`}>
                    <div className={`h-1 w-full ${report.severity === "critical" ? "bg-red-500" : report.severity === "high" ? "bg-orange-500" : report.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-bold text-sm">{report.title}</h3>
                            {report.flagType && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-300 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold">
                                <Flag className="w-3 h-3 inline mr-1" />{report.flagType.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${getSeverityColor(report.severity)}`}>{report.severity}</span>
                            {getStatusBadge(report.status)}
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{report.location}</span>
                            {report.priorityScore && (
                              <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground">Priority: {report.priorityScore}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                      {report.adminNotes && (
                        <div className="bg-muted/60 border rounded-xl p-3 mb-3">
                          <p className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3" />Admin Notes</p>
                          <p className="text-sm">{report.adminNotes}</p>
                        </div>
                      )}
                      {report.aiValidationNotes && (
                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-3">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">🤖 AI Validation (Score: {report.aiValidationScore}/100)</p>
                          <p className="text-sm">{report.aiValidationNotes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs"
                          onClick={() => { setSelectedReport(report); setFlagDialogOpen(true); }}
                          data-testid={`button-flag-${report.id}`}>
                          <Flag className="w-3.5 h-3.5 mr-1.5" />Flag
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs"
                          onClick={() => { setSelectedReport(report); setAssignDialogOpen(true); }}
                          data-testid={`button-assign-${report.id}`}>
                          <UserPlus className="w-3.5 h-3.5 mr-1.5" />Assign
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs"
                          onClick={() => { setSelectedReport(report); setAdminNotes(report.adminNotes || ""); setNotesDialogOpen(true); }}
                          data-testid={`button-notes-${report.id}`}>
                          <FileText className="w-3.5 h-3.5 mr-1.5" />Notes
                        </Button>
                        {report.status === "reported" && (
                          <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "verified" })}
                            data-testid={`button-verify-${report.id}`}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Mark Verified
                          </Button>
                        )}
                        {report.status === "verified" && (
                          <Button size="sm" className="h-8 text-xs bg-slate-600 hover:bg-slate-700 text-white"
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "resolved" })}
                            data-testid={`button-resolve-${report.id}`}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Mark Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* User Management Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="users" className="mt-4">
              {isLoadingAllUsers ? (
                <div className="rounded-2xl border bg-background p-12 text-center">
                  <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading users…</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="rounded-2xl border bg-background p-12 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">No users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers.map((usr) => (
                    <div key={usr.id} className="rounded-2xl border bg-background p-4 shadow-sm flex items-center justify-between gap-4" data-testid={`user-card-${usr.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                          {(usr.name || usr.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm">{usr.name || usr.email}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize
                              ${usr.role === "admin" ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" :
                                usr.role === "ngo" ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300" :
                                usr.role === "volunteer" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                                "bg-muted text-muted-foreground"}`}>
                              {usr.role || "citizen"}
                            </span>
                            {usr.id === user?.id && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">You</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{usr.email}{usr.phoneNumber ? ` · ${usr.phoneNumber}` : ""}</p>
                          <p className="text-xs text-muted-foreground">Joined {new Date(usr.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs flex-shrink-0"
                        onClick={() => { setSelectedUser(usr); setNewRole(usr.role || "citizen"); setRoleDialogOpen(true); }}
                        disabled={usr.id === user?.id}
                        data-testid={`button-change-role-${usr.id}`}>
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />Change Role
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Flag Dialog */}
        <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag Report</DialogTitle>
              <DialogDescription>
                Mark this report as false, duplicate, or spam
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={flagType} onValueChange={setFlagType}>
                <SelectTrigger data-testid="select-flag-type">
                  <SelectValue placeholder="Select flag type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false_report">False Report</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Add admin notes (optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                data-testid="textarea-flag-notes"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)} data-testid="button-cancel-flag">
                Cancel
              </Button>
              <Button onClick={handleFlagReport} data-testid="button-confirm-flag">
                Flag Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Report</DialogTitle>
              <DialogDescription>
                Assign this report to a volunteer or team member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isLoadingUsers ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading volunteers...</p>
                </div>
              ) : assignableUsers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No volunteers available</p>
                </div>
              ) : (
                <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                  <SelectTrigger data-testid="select-volunteer">
                    <SelectValue placeholder="Select a volunteer or team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.name || user.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)} data-testid="button-cancel-assign">
                Cancel
              </Button>
              <Button 
                onClick={handleAssignReport} 
                disabled={!selectedVolunteer || isLoadingUsers} 
                data-testid="button-confirm-assign"
              >
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Notes</DialogTitle>
              <DialogDescription>
                Add or update admin notes for this report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Enter admin notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={6}
                data-testid="textarea-admin-notes"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)} data-testid="button-cancel-notes">
                Cancel
              </Button>
              <Button onClick={handleAddNotes} disabled={!adminNotes.trim()} data-testid="button-save-notes">
                Save Notes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser?.name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="ngo">NGO</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Changing user roles affects their access permissions. 
                  Admin roles have full system access.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)} data-testid="button-cancel-role">
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateUserRole} 
                disabled={!newRole || newRole === selectedUser?.role}
                data-testid="button-confirm-role"
              >
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
