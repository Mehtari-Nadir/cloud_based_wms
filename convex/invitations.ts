import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { roleTypes, invitationStatus } from "./schema";
import { getUserByClerkId, requirePermission } from "./lib/permissions";

// Invite a user to a warehouse (owner only)
export const inviteUser = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    email: v.string(),
    role: roleTypes,
    clerkId: v.string(),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    await requirePermission(ctx, user._id, args.warehouseId, "users:invite");

    // Check if user is already a member
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      const existingMember = await ctx.db
        .query("warehouseMembers")
        .withIndex("by_warehouse_and_user", (q) =>
          q.eq("warehouseId", args.warehouseId).eq("userId", existingUser._id)
        )
        .unique();

      if (existingMember) {
        throw new Error("User is already a member of this warehouse");
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email_and_warehouse", (q) =>
        q.eq("email", args.email).eq("warehouseId", args.warehouseId)
      )
      .unique();

    if (existingInvitation && existingInvitation.status === "pending") {
      throw new Error("An invitation is already pending for this email");
    }

    // Delete old declined/accepted invitations if they exist
    if (existingInvitation) {
      await ctx.db.delete(existingInvitation._id);
    }

    // Create invitation
    const invitationId = await ctx.db.insert("invitations", {
      warehouseId: args.warehouseId,
      email: args.email,
      role: args.role,
      invitedBy: user._id,
      status: "pending",
      invitedAt: Date.now(),
    });

    return invitationId;
  },
});

// Get pending invitations for the current user
export const getMyInvitations = query({
  args: {
    clerkId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      warehouseId: v.id("warehouses"),
      warehouseName: v.string(),
      role: roleTypes,
      invitedByName: v.string(),
      invitedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) return [];

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .collect();

    const pendingInvitations = invitations.filter(
      (inv) => inv.status === "pending"
    );

    const result = await Promise.all(
      pendingInvitations.map(async (inv) => {
        const warehouse = await ctx.db.get(inv.warehouseId);
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          _id: inv._id,
          warehouseId: inv.warehouseId,
          warehouseName: warehouse?.name ?? "Unknown",
          role: inv.role as "owner" | "manager" | "staff",
          invitedByName: inviter?.name ?? "Unknown",
          invitedAt: inv.invitedAt,
        };
      })
    );

    return result;
  },
});

// Get invitations for a warehouse (owner only)
export const getWarehouseInvitations = query({
  args: {
    warehouseId: v.id("warehouses"),
    clerkId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      role: roleTypes,
      status: invitationStatus,
      invitedByName: v.string(),
      invitedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) return [];

    // Only owners can see invitations
    const membership = await ctx.db
      .query("warehouseMembers")
      .withIndex("by_warehouse_and_user", (q) =>
        q.eq("warehouseId", args.warehouseId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      return [];
    }

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .collect();

    const result = await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          _id: inv._id,
          email: inv.email,
          role: inv.role as "owner" | "manager" | "staff",
          status: inv.status as "pending" | "accepted" | "declined",
          invitedByName: inviter?.name ?? "Unknown",
          invitedAt: inv.invitedAt,
        };
      })
    );

    return result;
  },
});

// Accept an invitation
export const acceptInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.email !== user.email) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer pending");
    }

    // Check if already a member
    const existingMember = await ctx.db
      .query("warehouseMembers")
      .withIndex("by_warehouse_and_user", (q) =>
        q.eq("warehouseId", invitation.warehouseId).eq("userId", user._id)
      )
      .unique();

    if (existingMember) {
      throw new Error("You are already a member of this warehouse");
    }

    // Add user as member
    await ctx.db.insert("warehouseMembers", {
      warehouseId: invitation.warehouseId,
      userId: user._id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      joinedAt: Date.now(),
    });

    // Update invitation status
    await ctx.db.patch(args.invitationId, { status: "accepted" });

    return null;
  },
});

// Decline an invitation
export const declineInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.email !== user.email) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer pending");
    }

    await ctx.db.patch(args.invitationId, { status: "declined" });

    return null;
  },
});

// Cancel/revoke an invitation (owner only)
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    clerkId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    await requirePermission(ctx, user._id, invitation.warehouseId, "users:invite");

    await ctx.db.delete(args.invitationId);

    return null;
  },
});
