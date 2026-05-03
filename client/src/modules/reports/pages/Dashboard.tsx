/**
 * Dashboard — role-aware entry point.
 *
 * This page is the "/" and "/dashboard" route for all authenticated users.
 * Instead of a single dashboard with hidden/shown sections per role, each
 * role gets a completely separate product surface:
 *
 *   citizen / user   → CitizenDashboard     (SOS-first, minimal)
 *   volunteer / ngo  → VolunteerCommandDashboard  (task-driven)
 *   admin / super    → AdminDashboard redirect   (operations control)
 *   authority / gov  → AuthorityCommandCenter    (map-primary command)
 *
 * The RoleDashboard component handles the routing logic.
 * This file stays thin — no business logic lives here.
 */
import { RoleDashboard } from "@/features/roles";

export default function Dashboard() {
  return <RoleDashboard />;
}
