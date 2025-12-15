import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { warehouseFields } from "./schema";

export const getWarehouseByName = query({
  args: {
    warehouseName: v.string()
  },
  handler: async (ctx, args) => {
    const warehouse = await ctx.db
      .query("warehouses")
      .withIndex("by_warehouse_name", (q) => q.eq("name", args.warehouseName))
      .unique();

    return warehouse;
  }
});

export const getWarehouses = query({
  args: {},
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

export const createWarehouse = mutation({
  args: {
    name: warehouseFields.name,
    description: warehouseFields.description,
    createdBy: warehouseFields.createdBy
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("warehouses", {
      name: args.name,
      description: args.description,
      createdBy: args.createdBy
    });
  }
});

export const deleteWarehouse = mutation({
  args: {
    warehouseId: v.id("warehouses")
  },
  handler: async (ctx, args) => {

    // TODO: I should add user permission here
    await ctx.db.delete(args.warehouseId);
  }
});