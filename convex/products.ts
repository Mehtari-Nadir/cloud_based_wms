import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { productFields } from "./schema";
import { getUserByClerkId, requirePermission, checkPermission } from "./lib/permissions";
import { internal } from "./_generated/api";

// Generate upload URL for product image
export const generateUploadUrl = mutation({
    args: {},
    returns: v.string(),
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Delete an uploaded image (used when user cancels creation)
export const deleteImage = mutation({
    args: {
        imageId: v.id("_storage"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.storage.delete(args.imageId);
        return null;
    },
});

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
            imageUrl: v.union(v.string(), v.null()),
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
            imageUrl: string | null;
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
                    const imageUrl = product.imageId 
                        ? await ctx.storage.getUrl(product.imageId) 
                        : null;
                    
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
                        imageUrl,
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
        imageId: v.optional(v.id("_storage")),
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
            imageId: args.imageId,
            alertThresholds: args.alertThresholds,
        });

        // Schedule embedding generation for semantic search
        await ctx.scheduler.runAfter(0, internal.embedding.generateProductEmbedding, {
            productId,
            name: args.name,
            description: args.description,
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
        imageId: v.optional(v.union(v.id("_storage"), v.null())),
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

        // If replacing image, delete old one
        if (args.imageId !== undefined && product.imageId && args.imageId !== product.imageId) {
            await ctx.storage.delete(product.imageId);
        }

        const updates: Partial<{
            name: string;
            sku: string;
            description: string;
            quantity: number;
            unit: string;
            price: string;
            imageId: any;
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
        if (args.imageId !== undefined) updates.imageId = args.imageId;
        if (args.alertThresholds !== undefined) updates.alertThresholds = args.alertThresholds;

        await ctx.db.patch(args.productId, updates);

        // Regenerate embedding if name or description changed
        if (args.name !== undefined || args.description !== undefined) {
            const updatedProduct = await ctx.db.get(args.productId);
            if (updatedProduct) {
                await ctx.scheduler.runAfter(0, internal.embedding.generateProductEmbedding, {
                    productId: args.productId,
                    name: updatedProduct.name,
                    description: updatedProduct.description,
                });
            }
        }

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