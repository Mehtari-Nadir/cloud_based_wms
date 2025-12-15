import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { storeTypes } from "./schema";
import { getUserByClerkId, requirePermission, checkPermission } from "./lib/permissions";

// Get ALL stores for the current user (across all their warehouses)
export const getMyStores = query({
    args: {
        clerkId: v.string(),
    },
    returns: v.array(
        v.object({
            _id: v.id("stores"),
            _creationTime: v.number(),
            warehouseId: v.id("warehouses"),
            warehouseName: v.string(),
            name: v.string(),
            storeType: storeTypes,
            productCount: v.number(),
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

        const allStores: Array<{
            _id: any;
            _creationTime: number;
            warehouseId: any;
            warehouseName: string;
            name: string;
            storeType: "plumbing" | "construction" | "electric" | "chemical";
            productCount: number;
        }> = [];

        for (const membership of memberships) {
            const warehouse = await ctx.db.get(membership.warehouseId);
            if (!warehouse) continue;

            const stores = await ctx.db
                .query("stores")
                .withIndex("by_warehouse_id", (q) => q.eq("warehouseId", membership.warehouseId))
                .collect();

            for (const store of stores) {
                const products = await ctx.db
                    .query("products")
                    .withIndex("by_store", (q) => q.eq("storeId", store._id))
                    .collect();

                allStores.push({
                    _id: store._id,
                    _creationTime: store._creationTime,
                    warehouseId: store.warehouseId,
                    warehouseName: warehouse.name,
                    name: store.name,
                    storeType: store.storeType,
                    productCount: products.length,
                });
            }
        }

        return allStores;
    }
});

// Get stores for a warehouse (all roles can view)
export const getStoresByWarehouse = query({
    args: {
        warehouseId: v.id("warehouses"),
        clerkId: v.string(),
    },
    returns: v.array(
        v.object({
            _id: v.id("stores"),
            _creationTime: v.number(),
            warehouseId: v.id("warehouses"),
            name: v.string(),
            storeType: storeTypes,
            productCount: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) return [];

        const hasAccess = await checkPermission(ctx, user._id, args.warehouseId, "stores:view");
        if (!hasAccess) return [];

        const stores = await ctx.db
            .query("stores")
            .withIndex("by_warehouse_id", (q) => q.eq("warehouseId", args.warehouseId))
            .collect();

        const result = await Promise.all(
            stores.map(async (store) => {
                const products = await ctx.db
                    .query("products")
                    .withIndex("by_store", (q) => q.eq("storeId", store._id))
                    .collect();
                return {
                    ...store,
                    productCount: products.length,
                };
            })
        );

        return result;
    }
});

// Create a store (owner, manager)
export const createStore = mutation({
    args: {
        warehouseId: v.id("warehouses"),
        name: v.string(),
        storeType: storeTypes,
        clerkId: v.string(),
    },
    returns: v.id("stores"),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) {
            throw new Error("User not found");
        }

        await requirePermission(ctx, user._id, args.warehouseId, "stores:create");

        const storeId = await ctx.db.insert("stores", {
            warehouseId: args.warehouseId,
            name: args.name,
            storeType: args.storeType,
        });

        return storeId;
    }
});

// Update a store (owner, manager)
export const updateStore = mutation({
    args: {
        storeId: v.id("stores"),
        name: v.optional(v.string()),
        storeType: v.optional(storeTypes),
        clerkId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) {
            throw new Error("User not found");
        }

        const store = await ctx.db.get(args.storeId);
        if (!store) {
            throw new Error("Store not found");
        }

        await requirePermission(ctx, user._id, store.warehouseId, "stores:update");

        const updates: Partial<{ name: string; storeType: "plumbing" | "construction" | "electric" | "chemical" }> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.storeType !== undefined) updates.storeType = args.storeType;

        await ctx.db.patch(args.storeId, updates);
        return null;
    }
});

// Delete a store (owner only)
export const deleteStore = mutation({
    args: {
        storeId: v.id("stores"),
        clerkId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) {
            throw new Error("User not found");
        }

        const store = await ctx.db.get(args.storeId);
        if (!store) {
            throw new Error("Store not found");
        }

        await requirePermission(ctx, user._id, store.warehouseId, "stores:delete");

        // Delete all products in the store
        const products = await ctx.db
            .query("products")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        for (const product of products) {
            await ctx.db.delete(product._id);
        }

        await ctx.db.delete(args.storeId);
        return null;
    }
});

// Legacy - get all stores (consider removing)
export const getStores = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("stores"),
            _creationTime: v.number(),
            warehouseId: v.id("warehouses"),
            name: v.string(),
            storeType: storeTypes,
        })
    ),
    handler: async (ctx) => {
        const stores = await ctx.db.query("stores").collect();
        return stores;
    }
});