import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Users, Building2, UserCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    value: "citizen",
    label: "Citizen",
    description: "Report emergencies, verify incidents, and receive alerts in your area.",
    icon: UserCircle,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-500",
    accent: "border-slate-400",
    badge: "For everyone",
    badgeCls: "bg-slate-100 text-slate-600",
  },
  {
    value: "volunteer",
    label: "Volunteer",
    description: "Help coordinate emergency responses, fulfill resource requests, and support affected communities.",
    icon: Users,
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600",
    accent: "border-green-500",
    badge: "Help others",
    badgeCls: "bg-green-100 text-green-700",
  },
  {
    value: "ngo",
    label: "NGO / Organization",
    description: "Manage relief operations, track resources, and coordinate large-scale emergency responses.",
    icon: Building2,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    accent: "border-blue-500",
    badge: "Organizations",
    badgeCls: "bg-blue-100 text-blue-700",
  },
  {
    value: "admin",
    label: "Administrator",
    description: "Full platform access — system administration, user management, and AI override capabilities.",
    icon: Shield,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600",
    accent: "border-purple-500",
    badge: "Full access",
    badgeCls: "bg-purple-100 text-purple-700",
  },
];

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "citizen");

  useEffect(() => {
    if (user?.role) setSelectedRole(user.role);
  }, [user?.role]);

  const updateRoleMutation = useMutation({
    mutationFn: (role: string) =>
      apiRequest("/api/auth/update-role", { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Role updated", description: "Your role has been updated successfully." });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update role.", variant: "destructive" });
    },
  });

  const availableRoles = ROLES.filter((role) => {
    if (user?.role === "admin") return role.value === "admin";
    return role.value !== "admin";
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-black mb-1">Select Your Role</h1>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to participate in emergency response. Your role determines what features you can access.
          </p>
          {user?.role === "admin" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              Admins cannot change their role. Contact another admin if needed.
            </div>
          )}
        </div>

        {/* Role cards */}
        <div className="space-y-3 mb-8">
          {availableRoles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.value;
            const isCurrent = user?.role === role.value;
            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                disabled={user?.role === "admin"}
                data-testid={`radio-role-${role.value}`}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                  isSelected
                    ? `${role.accent} bg-muted/50 shadow-sm`
                    : "border-border hover:border-muted-foreground/50 bg-background",
                  user?.role === "admin" && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", role.iconBg)}>
                  <Icon className={cn("w-5 h-5", role.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm">{role.label}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", role.badgeCls)}>
                      {role.badge}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {isSelected
                    ? <CheckCircle2 className={cn("w-5 h-5", role.iconColor)} />
                    : <div className="w-5 h-5 rounded-full border-2 border-border" />
                  }
                </div>
              </button>
            );
          })}
        </div>

        {/* Action */}
        <Button
          onClick={() => updateRoleMutation.mutate(selectedRole)}
          disabled={updateRoleMutation.isPending || selectedRole === user?.role}
          className="w-full h-11 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"
          data-testid="button-submit-role"
        >
          {updateRoleMutation.isPending
            ? "Saving…"
            : selectedRole === user?.role
              ? "No changes — already using this role"
              : <>Continue as {ROLES.find(r => r.value === selectedRole)?.label} <ChevronRight className="w-4 h-4 ml-1" /></>
          }
        </Button>
      </div>
    </DashboardLayout>
  );
}
