/**
 * Centralised role-based permission hook.
 * Single source of truth for what each role can do.
 */
import { useAuthStore } from "@/store/authStore";

type Role = "citizen" | "volunteer" | "ngo" | "admin" | "government" | "authority" | "super_admin";

const ROLE_LEVEL: Record<Role, number> = {
  citizen: 1,
  volunteer: 2,
  ngo: 3,
  government: 4,
  authority: 5,
  admin: 6,
  super_admin: 7,
};

function level(role?: string | null): number {
  return ROLE_LEVEL[(role as Role) ?? "citizen"] ?? 1;
}

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);

  const hasRole = (...roles: Role[]) => roles.includes(role as Role);

  const atLeast = (minRole: Role) => level(role) >= level(minRole);

  return {
    role,
    hasRole,
    atLeast,

    // Convenience booleans
    isCitizen:    hasRole("citizen"),
    isVolunteer:  hasRole("volunteer"),
    isNGO:        hasRole("ngo"),
    isGovernment: hasRole("government"),
    isAuthority:  hasRole("authority"),
    isAdmin:      hasRole("admin"),
    isSuperAdmin: hasRole("super_admin"),

    // Feature-level gates
    canSubmitReport:      atLeast("citizen"),
    canVerifyReport:      atLeast("volunteer"),
    canConfirmReport:     atLeast("volunteer"),
    canManageInventory:   atLeast("ngo"),
    canBroadcastAlerts:   atLeast("ngo"),
    canViewAnalytics:     atLeast("government"),
    canManageUsers:       atLeast("admin"),
    canAccessSimulation:  atLeast("admin"),
    canOverrideAI:        atLeast("admin"),
    canViewDevPlatform:   atLeast("government"),
  };
}
