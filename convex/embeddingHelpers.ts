import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Internal mutation to update product embedding
export const updateProductEmbedding = internalMutation({
    args: {
        productId: v.id("products"),
        embedding: v.array(v.float64()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.productId, { embedding: args.embedding });
        return null;
    },
});

// Internal query to get all products without embeddings (for migration)
export const getProductsWithoutEmbeddings = internalQuery({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("products"),
            name: v.string(),
            description: v.string(),
        })
    ),
    handler: async (ctx) => {
        const products = await ctx.db.query("products").collect();
        return products
            .filter((p) => !p.embedding || p.embedding.length === 0)
            .map((p) => ({
                _id: p._id,
                name: p.name,
                description: p.description,
            }));
    },
});

// Internal query to get user's accessible store IDs
export const getUserAccessibleStoreIds = internalQuery({
    args: {
        clerkId: v.string(),
    },
    returns: v.array(v.id("stores")),
    handler: async (ctx, args) => {
        // Find user by clerkId
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (!user) return [];

        // Get all warehouse memberships for this user
        const memberships = await ctx.db
            .query("warehouseMembers")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        // Get all stores from user's warehouses
        const storeIds: Id<"stores">[] = [];
        for (const membership of memberships) {
            const stores = await ctx.db
                .query("stores")
                .withIndex("by_warehouse_id", (q) => q.eq("warehouseId", membership.warehouseId))
                .collect();
            storeIds.push(...stores.map((s) => s._id));
        }

        return storeIds;
    },
});

// Internal query to get product details with store and warehouse info
export const getProductDetails = internalQuery({
    args: {
        productId: v.id("products"),
    },
    returns: v.union(
        v.object({
            _id: v.id("products"),
            name: v.string(),
            sku: v.string(),
            description: v.string(),
            quantity: v.number(),
            unit: v.string(),
            storeName: v.string(),
            warehouseName: v.string(),
            imageUrl: v.union(v.string(), v.null()),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.productId);
        if (!product) return null;

        const store = await ctx.db.get(product.storeId);
        if (!store) return null;

        const warehouse = await ctx.db.get(store.warehouseId);
        if (!warehouse) return null;

        const imageUrl = product.imageId
            ? await ctx.storage.getUrl(product.imageId)
            : null;

        return {
            _id: product._id,
            name: product.name,
            sku: product.sku,
            description: product.description,
            quantity: product.quantity,
            unit: product.unit,
            storeName: store.name,
            warehouseName: warehouse.name,
            imageUrl,
        };
    },
});
