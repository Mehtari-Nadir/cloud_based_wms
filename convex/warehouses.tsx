import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { warehouseFields, roleTypes } from "./schema";
import { getUserByClerkId, requirePermission, getUserRole } from "./lib/permissions";

export const getWarehouseByName = query({
  args: {
    warehouseName: v.string()
  },
  returns: v.union(
    v.object({
      _id: v.id("warehouses"),
      _creationTime: v.number(),
      createdBy: v.id("users"),
      name: v.string(),
      description: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const warehouse = await ctx.db
      .query("warehouses")
      .withIndex("by_warehouse_name", (q) => q.eq("name", args.warehouseName))
      .unique();

    return warehouse;
  }
});

// Get warehouses that the current user is a member of
export const getMyWarehouses = query({
  args: {
    clerkId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("warehouses"),
      _creationTime: v.number(),
      createdBy: v.id("users"),
      name: v.string(),
      description: v.string(),
      total_stores: v.number(),
      total_items: v.number(),
      role: roleTypes,
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) return [];

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("warehouseMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const warehouses = await Promise.all(
      memberships.map(async (membership) => {
        const warehouse = await ctx.db.get(membership.warehouseId);
        if (!warehouse) return null;

        const stores = await ctx.db
          .query("stores")
          .withIndex("by_warehouse_id", (q) => q.eq("warehouseId", warehouse._id))
          .collect();

        const storeStats = await Promise.all(
          stores.map(async (store) => {
            const products = await ctx.db
              .query("products")
              .withIndex("by_store", (q) => q.eq("storeId", store._id))
              .collect();
            return products.reduce((acc, p) => acc + p.quantity, 0);
          })
        );

        const total_items = storeStats.reduce((acc, curr) => acc + curr, 0);

        return {
          ...warehouse,
          total_stores: stores.length,
          total_items,
          role: membership.role as "owner" | "manager" | "staff",
        };
      })
    );

    return warehouses.filter((w) => w !== null);
  },
});

export const getWarehouses = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("warehouses"),
      _creationTime: v.number(),
      createdBy: v.id("users"),
      name: v.string(),
      description: v.string(),
      total_stores: v.number(),
      total_items: v.number(),
    })
  ),
  handler: async (ctx) => {
    const warehouses = await ctx.db.query("warehouses").collect();

    return await Promise.all(
      warehouses.map(async (warehouse) => {
        const stores = await ctx.db
          .query("stores")
          .withIndex("by_warehouse_id", (q) => q.eq("warehouseId", warehouse._id))
          .collect();

        const storeStats = await Promise.all(
          stores.map(async (store) => {
            const products = await ctx.db
              .query("products")
              .withIndex("by_store", (q) => q.eq("storeId", store._id))
              .collect();
            return products.reduce((acc, p) => acc + p.quantity, 0);
          })
        );

        const total_items = storeStats.reduce((acc, curr) => acc + curr, 0);

        return {
          ...warehouse,
          total_stores: stores.length,
          total_items,
        };
      })
    );
  },
});

// Create warehouse and automatically assign creator as owner
export const createWarehouse = mutation({
  args: {
    name: warehouseFields.name,
    description: warehouseFields.description,
    clerkId: v.string(),
  },
  returns: v.id("warehouses"),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create the warehouse
    const warehouseId = await ctx.db.insert("warehouses", {
      name: args.name,
      description: args.description,
      createdBy: user._id,
    });

    // Add creator as owner
    await ctx.db.insert("warehouseMembers", {
      warehouseId,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });

    return warehouseId;
  }
});

export const updateWarehouse = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    await requirePermission(ctx, user._id, args.warehouseId, "warehouse:update");

    const updates: Partial<{ name: string; description: string }> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.warehouseId, updates);
    return null;
  }
});

export const deleteWarehouse = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    await requirePermission(ctx, user._id, args.warehouseId, "warehouse:delete");

    // Delete all members
    const members = await ctx.db
      .query("warehouseMembers")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .collect();
    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Delete all stores and their products
    const stores = await ctx.db
      .query("stores")
      .withIndex("by_warehouse_id", (q) => q.eq("warehouseId", args.warehouseId))
      .collect();
    for (const store of stores) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_store", (q) => q.eq("storeId", store._id))
        .collect();
      for (const product of products) {
        await ctx.db.delete(product._id);
      }
      await ctx.db.delete(store._id);
    }

    await ctx.db.delete(args.warehouseId);
    return null;
  }
});

// Get warehouse members (for owners and managers)
export const getWarehouseMembers = query({
  args: {
    warehouseId: v.id("warehouses"),
    clerkId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("warehouseMembers"),
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: roleTypes,
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) return [];

    const role = await getUserRole(ctx, user._id, args.warehouseId);
    if (!role || role === "staff") {
      return []; // Staff can't view users
    }

    const members = await ctx.db
      .query("warehouseMembers")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .collect();

    const result = await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        return {
          _id: member._id,
          userId: member.userId,
          name: memberUser?.name ?? "Unknown",
          email: memberUser?.email ?? "",
          role: member.role as "owner" | "manager" | "staff",
          joinedAt: member.joinedAt,
        };
      })
    );

    return result;
  },
});

// Change a member's role (owner only)
export const changeMemberRole = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    memberId: v.id("warehouseMembers"),
    newRole: roleTypes,
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    await requirePermission(ctx, user._id, args.warehouseId, "roles:change");

    const member = await ctx.db.get(args.memberId);
    if (!member || member.warehouseId !== args.warehouseId) {
      throw new Error("Member not found");
    }

    // Can't change your own role
    if (member.userId === user._id) {
      throw new Error("Cannot change your own role");
    }

    await ctx.db.patch(args.memberId, { role: args.newRole });
    return null;
  }
});

// Remove a member from warehouse (owner only)
export const removeMember = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    memberId: v.id("warehouseMembers"),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    await requirePermission(ctx, user._id, args.warehouseId, "users:remove");

    const member = await ctx.db.get(args.memberId);
    if (!member || member.warehouseId !== args.warehouseId) {
      throw new Error("Member not found");
    }

    // Can't remove yourself
    if (member.userId === user._id) {
      throw new Error("Cannot remove yourself");
    }

    await ctx.db.delete(args.memberId);
    return null;
  }
});