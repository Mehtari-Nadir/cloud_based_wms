import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { productFields } from "./schema";
import { getUserByClerkId, requirePermission, checkPermission } from "./lib/permissions";

// Get ALL products for the current user (across all their warehouses/stores)
export const getMyProducts = query({
    args: {
        clerkId: v.string(),
    },
    returns: v.array(
        v.object({
            _id: v.id("products"),
            _creationTime: v.number(),
            storeId: v.id("stores"),
            storeName: v.string(),
            warehouseId: v.id("warehouses"),
            warehouseName: v.string(),
            name: v.string(),
            sku: v.string(),
            description: v.string(),
            quantity: v.number(),
            unit: v.string(),
            price: v.string(),
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

        const allProducts: Array<{
            _id: any;
            _creationTime: number;
            storeId: any;
            storeName: string;
            warehouseId: any;
            warehouseName: string;
            name: string;
            sku: string;
            description: string;
            quantity: number;
            unit: string;
            price: string;
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

                for (const product of products) {
                    allProducts.push({
                        _id: product._id,
                        _creationTime: product._creationTime,
                        storeId: store._id,
                        storeName: store.name,
                        warehouseId: warehouse._id,
                        warehouseName: warehouse.name,
                        name: product.name,
                        sku: product.sku,
                        description: product.description,
                        quantity: product.quantity,
                        unit: product.unit,
                        price: product.price,
                    });
                }
            }
        }

        return allProducts;
    }
});

// Get products for a store (all roles can view)
export const getProductsByStore = query({
    args: {
        storeId: v.id("stores"),
        clerkId: v.string(),
    },
    returns: v.array(
        v.object({
            _id: v.id("products"),
            _creationTime: v.number(),
            storeId: v.id("stores"),
            name: v.string(),
            sku: v.string(),
            description: v.string(),
            quantity: v.number(),
            unit: v.string(),
            price: v.string(),
            alertThresholds: v.object({
                lowStock: v.number(),
                outOfStock: v.number(),
                reorderPoint: v.number(),
                criticalLow: v.number(),
                overstock: v.number()
            })
        })
    ),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) return [];

        const store = await ctx.db.get(args.storeId);
        if (!store) return [];

        const hasAccess = await checkPermission(ctx, user._id, store.warehouseId, "inventory:view");
        if (!hasAccess) return [];

        const products = await ctx.db
            .query("products")
            .withIndex("by_store", (q) => q.eq("storeId", args.storeId))
            .collect();

        return products;
    }
});

// Create a product (all roles can create inventory)
export const createProduct = mutation({
    args: {
        storeId: v.id("stores"),
        name: productFields.name,
        sku: productFields.sku,
        description: productFields.description,
        quantity: productFields.quantity,
        unit: productFields.unit,
        price: productFields.price,
        alertThresholds: productFields.alertThresholds,
        clerkId: v.string(),
    },
    returns: v.id("products"),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) {
            throw new Error("User not found");
        }

        const store = await ctx.db.get(args.storeId);
        if (!store) {
            throw new Error("Store not found");
        }

        await requirePermission(ctx, user._id, store.warehouseId, "inventory:create");

        const productId = await ctx.db.insert("products", {
            storeId: args.storeId,
            name: args.name,
            sku: args.sku,
            description: args.description,
            quantity: args.quantity,
            unit: args.unit,
            price: args.price,
            alertThresholds: args.alertThresholds,
        });

        return productId;
    }
});

// Update a product (all roles can update inventory)
export const updateProduct = mutation({
    args: {
        productId: v.id("products"),
        name: v.optional(v.string()),
        sku: v.optional(v.string()),
        description: v.optional(v.string()),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
        price: v.optional(v.string()),
        alertThresholds: v.optional(productFields.alertThresholds),
        clerkId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) {
            throw new Error("User not found");
        }

        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error("Product not found");
        }

        const store = await ctx.db.get(product.storeId);
        if (!store) {
            throw new Error("Store not found");
        }

        await requirePermission(ctx, user._id, store.warehouseId, "inventory:update");

        const updates: Partial<{
            name: string;
            sku: string;
            description: string;
            quantity: number;
            unit: string;
            price: string;
            alertThresholds: {
                lowStock: number;
                outOfStock: number;
                reorderPoint: number;
                criticalLow: number;
                overstock: number;
            };
        }> = {};

        if (args.name !== undefined) updates.name = args.name;
        if (args.sku !== undefined) updates.sku = args.sku;
        if (args.description !== undefined) updates.description = args.description;
        if (args.quantity !== undefined) updates.quantity = args.quantity;
        if (args.unit !== undefined) updates.unit = args.unit;
        if (args.price !== undefined) updates.price = args.price;
        if (args.alertThresholds !== undefined) updates.alertThresholds = args.alertThresholds;

        await ctx.db.patch(args.productId, updates);
        return null;
    }
});

// Delete a product (owner, manager only)
export const deleteProduct = mutation({
    args: {
        productId: v.id("products"),
        clerkId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const user = await getUserByClerkId(ctx, args.clerkId);
        if (!user) {
            throw new Error("User not found");
        }

        const product = await ctx.db.get(args.productId);
        if (!product) {
            throw new Error("Product not found");
        }

        const store = await ctx.db.get(product.storeId);
        if (!store) {
            throw new Error("Store not found");
        }

        await requirePermission(ctx, user._id, store.warehouseId, "inventory:delete");

        await ctx.db.delete(args.productId);
        return null;
    }
});

// Legacy - get all products (consider removing)
export const getProducts = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("products"),
            _creationTime: v.number(),
            storeId: v.id("stores"),
            name: v.string(),
            sku: v.string(),
            description: v.string(),
            quantity: v.number(),
            unit: v.string(),
            price: v.string(),
            alertThresholds: v.object({
                lowStock: v.number(),
                outOfStock: v.number(),
                reorderPoint: v.number(),
                criticalLow: v.number(),
                overstock: v.number()
            })
        })
    ),
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        return products;
    }
});