import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const getUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users;
    }
});


// type TColumn = {
//     user_id: string;
//     name: string;
//     email: string;
//     assigned_warehouses: string[];
//     role: string;
//     joined_at: number;
// };

export const getUserDataTable = query({
    args: {},
    returns: v.object({
        user_id: v.string(),
        name: v.string(),
        email: v.string(),
        assigned_warehouses: v.array(v.string()),
        role: v.string(),
        joined_at: v.string()
    }),
    handler: async (ctx) => {
        // Get the first available user to populate the data table row
        const users = await ctx.db.query("users").order("asc").take(1);
        const user = users[0] ?? null;

        if (!user) {
            return {
                user_id: "",
                name: "",
                email: "",
                assigned_warehouses: [],
                role: "",
                joined_at: ""
            };
        }

        // Load warehouse memberships for this user
        const memberships = await ctx.db.query("warehouseMembers").collect();
        const userMemberships = memberships.filter((m) => m.userId === user._id);

        const assignedWarehouses: Array<string> = [];
        let role: string = "";

        for (const membership of userMemberships) {
            const warehouse = await ctx.db.get(membership.warehouseId);
            if (warehouse) {
                assignedWarehouses.push(warehouse.name);
            }
            // Use the first role found (if multiple memberships exist)
            if (!role && membership.role) {
                role = membership.role;
            }
        }

        return {
            user_id: user._id,
            name: user.name,
            email: user.email,
            assigned_warehouses: assignedWarehouses,
            role,
            joined_at: new Date(user._creationTime).toISOString()
        };
    }
});

export const upsertUser = internalMutation({
    args: {
        clerkId: v.string(),
        name: v.string(),
        email: v.string()
    },
    handler: async (ctx, args) => {

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existingUser) {
            // Update existing user
            await ctx.db.patch(existingUser._id, {
                name: existingUser.name,
                email: existingUser.email
            });
        } else {
            await ctx.db.insert("users", {
                name: args.name,
                email: args.email,
                clerkId: args.clerkId
            });
        }

    }
});

export const deleteUser = internalMutation({
    args: {
        clerkId: v.string()
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (user) {
            await ctx.db.delete(user._id);
        }
    }
});

export const getCurrentUser = query({
    args: {
        clerkId: v.string(),
    },
    returns: v.union(
        v.object({
            _id: v.id("users"),
            _creationTime: v.number(),
            clerkId: v.string(),
            name: v.string(),
            email: v.string(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    },
});