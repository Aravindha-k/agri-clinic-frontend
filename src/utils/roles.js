/**
 * Frontend role helpers for Agri Clinic admin SPA.
 * Backend remains the source of truth — these only hide/disable unsafe UI.
 *
 * Mapping (per product):
 * - kac.owner  ≈ is_superuser === true
 * - kac.admin  ≈ is_staff === true && is_superuser !== true (daily ops)
 */

export function isOwnerUser(user) {
  if (!user || typeof user !== "object") return false;
  if (user.is_superuser === true) return true;
  const role = String(user.role ?? user.user_role ?? user.account_type ?? "").toLowerCase();
  return role === "owner" || role === "kac.owner" || role === "kac_owner";
}

export function isStaffAdminUser(user) {
  if (!user || typeof user !== "object") return false;
  if (isOwnerUser(user)) return false;
  if (user.is_staff === true || user.is_admin === true) return true;
  const role = String(user.role ?? user.user_role ?? user.account_type ?? "").toLowerCase();
  return role === "admin" || role === "administrator" || role === "kac.admin" || role === "kac_admin";
}

/** True when the target account is a protected owner/superuser. */
export function isProtectedOwnerTarget(target) {
  if (!target || typeof target !== "object") return false;
  if (target.is_superuser === true) return true;
  const role = String(target.role ?? target.user_role ?? target.account_type ?? "").toLowerCase();
  return role === "owner" || role === "kac.owner" || role === "kac_owner";
}

/** Non-owners must not deactivate/delete/promote protected owners. */
export function canMutateEmployeeAccount(actor, target) {
  if (!actor) return false;
  if (isOwnerUser(actor)) return true;
  if (isProtectedOwnerTarget(target)) return false;
  return true;
}

export function canAssignAdminRole(actor) {
  return isOwnerUser(actor);
}

export function canAccessOwnerSecurityScreens(actor) {
  return isOwnerUser(actor);
}

/** Canonical owner-only SPA paths (nav + direct URL). */
export const OWNER_ONLY_PATHS = [
  "/audit",
  "/settings/security",
  "/admin/security",
];

export function isOwnerOnlyPath(pathname = "") {
  const path = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  return OWNER_ONLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Filter sidebar/search sections — drop ownerOnly items for non-owners. */
export function filterNavSectionsForUser(sections, user) {
  const allowOwner = canAccessOwnerSecurityScreens(user);
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => ({
      ...section,
      items: (section.items ?? []).filter((item) => {
        if (item?.ownerOnly) return allowOwner;
        if (item?.path && isOwnerOnlyPath(item.path)) return allowOwner;
        return true;
      }),
    }))
    .filter((section) => (section.items ?? []).length > 0);
}
