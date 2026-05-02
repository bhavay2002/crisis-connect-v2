import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Shield, Activity, MapPin, AlertCircle } from "lucide-react";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

const EXAMPLE_TEAMS = [
  {
    id: "1",
    name: "Emergency Medical Response",
    description: "First responders for medical emergencies and health crises",
    members: 12,
    activeIncidents: 3,
    location: "City Center",
    status: "active" as const,
    leader: "Dr. Sarah Johnson",
    specialty: "Medical",
    specialtyColor: "text-red-500",
    specialtyBg: "bg-red-500/10",
  },
  {
    id: "2",
    name: "Disaster Relief Team",
    description: "General disaster response and resource distribution",
    members: 18,
    activeIncidents: 5,
    location: "Multiple Districts",
    status: "active" as const,
    leader: "Mike Chen",
    specialty: "Relief",
    specialtyColor: "text-orange-500",
    specialtyBg: "bg-orange-500/10",
  },
  {
    id: "3",
    name: "Search and Rescue",
    description: "Specialized team for search and rescue operations",
    members: 8,
    activeIncidents: 1,
    location: "Mountain Region",
    status: "standby" as const,
    leader: "Alex Rivera",
    specialty: "SAR",
    specialtyColor: "text-blue-500",
    specialtyBg: "bg-blue-500/10",
  },
];

const totalMembers = EXAMPLE_TEAMS.reduce((s, t) => s + t.members, 0);
const totalIncidents = EXAMPLE_TEAMS.reduce((s, t) => s + t.activeIncidents, 0);

export default function ResponseTeams() {
  const { user } = useAuth();
  const canManageTeams = user?.role && ["volunteer", "ngo", "admin", "authority", "super_admin"].includes(user.role);

  if (!canManageTeams) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-xl mx-auto pt-16">
          <EmptyState
            icon={AlertCircle}
            title="Access Restricted"
            description="Response Teams are only available to volunteers, NGOs, and administrators. Please update your role to access team management features."
            iconClassName="bg-red-500/10"
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Response Teams</h1>
              <p className="text-sm text-muted-foreground">Coordinate with teams and manage emergency operations</p>
            </div>
          </div>
          <Button className="h-8 text-xs" data-testid="button-create-team">
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />Create Team
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Teams",     value: EXAMPLE_TEAMS.length,  icon: Users,    color: "text-blue-500",   bg: "bg-blue-500/10",   testId: "card-total-teams" },
            { label: "Total Members",   value: totalMembers,           icon: Shield,   color: "text-purple-500", bg: "bg-purple-500/10", testId: "card-total-members" },
            { label: "Active Incidents",value: totalIncidents,         icon: Activity, color: "text-red-500",    bg: "bg-red-500/10",    testId: "card-active-incidents" },
          ].map(({ label, value, icon: Icon, color, bg, testId }) => (
            <div key={label} className="rounded-2xl border bg-background p-4 flex items-center gap-3" data-testid={testId}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Teams list */}
        <div className="space-y-3">
          {EXAMPLE_TEAMS.map((team) => (
            <div
              key={team.id}
              className="rounded-2xl border bg-background p-5 hover:shadow-sm transition-shadow"
              data-testid={`card-team-${team.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", team.specialtyBg)}>
                    <Users className={cn("w-5 h-5", team.specialtyColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-sm">{team.name}</h3>
                      <Badge
                        className={cn(
                          "text-xs",
                          team.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                        data-testid={`badge-status-${team.id}`}
                      >
                        {team.status}
                      </Badge>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", team.specialtyBg, team.specialtyColor)}>
                        {team.specialty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{team.description}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{team.members} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />{team.activeIncidents} active
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{team.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />{team.leader}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-xs" data-testid={`button-view-team-${team.id}`}>
                    Details
                  </Button>
                  <Button size="sm" className="h-7 text-xs" data-testid={`button-join-team-${team.id}`}>
                    <UserPlus className="w-3 h-3 mr-1" />Join
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {EXAMPLE_TEAMS.length === 0 && (
            <EmptyState
              icon={Users}
              title="No Response Teams yet"
              description="Create your first response team to coordinate emergency operations."
              action={
                <Button size="sm" data-testid="button-create-first-team">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />Create First Team
                </Button>
              }
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
