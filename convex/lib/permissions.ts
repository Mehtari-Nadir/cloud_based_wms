/**
 * RBAC Permission helpers for the WMS
 * 
 * Roles: owner > manager > staff
 * - Owner: Full access (invite/remove users, manage roles, CRUD everything)
 * - Manager: Create/update stores & inventory, view users (read-only)
 * - Staff: View stores & inventory, create/update inventory items
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type Role = "owner" | "manager" | "staff";

export type Permission =
  | "warehouse:delete"
  | "warehouse:update"
  | "users:invite"
  | "users:remove"
  | "users:view"
  | "roles:change"
  | "stores:create"
  | "stores:update"
  | "stores:delete"
  | "stores:view"
  | "inventory:create"
  | "inventory:update"
  | "inventory:delete"
  | "inventory:view";

// Permission matrix
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "warehouse:delete",
    "warehouse:update",
    "users:invite",
    "users:remove",
    "users:view",
    "roles:change",
    "stores:create",
    "stores:update",
    "stores:delete",
    "stores:view",
    "inventory:create",
    "inventory:update",
    "inventory:delete",
    "inventory:view",
  ],
  manager: [
    "warehouse:update",
    "users:view",
    "stores:create",
    "stores:update",
    "stores:view",
    "inventory:create",
    "inventory:update",
    "inventory:view",
  ],
  staff: [
    "stores:view",
    "inventory:create",
    "inventory:update",
    "inventory:view",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get user's role in a warehouse
 */
export async function getUserRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  warehouseId: Id<"warehouses">
): Promise<Role | null> {
  const membership = await ctx.db
    .query("warehouseMembers")
    .withIndex("by_warehouse_and_user", (q) =>
      q.eq("warehouseId", warehouseId).eq("userId", userId)
    )
    .unique();

  return membership?.role as Role | null;
}

/**
 * Check if user has permission in a warehouse
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  warehouseId: Id<"warehouses">,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRole(ctx, userId, warehouseId);
  if (!role) return false;
  return hasPermission(role, permission);
}

/**
 * Get user by clerkId
 */
export async function getUserByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
) {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
}

/**
 * Require permission - throws if user doesn't have it
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  warehouseId: Id<"warehouses">,
  permission: Permission
): Promise<void> {
  const allowed = await checkPermission(ctx, userId, warehouseId, permission);
  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
