import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const userFields = {
  name: v.string(),
  email: v.string(),
};

export const warehouseFields = {
  createdBy: v.id("users"),
  name: v.string(),
  description: v.string(),
};

// pre-defined store types
export const storeTypes = v.union(
  v.literal("plumbing"),
  v.literal("construction"),
  v.literal("electric"),
  v.literal("chemical")
);

export const storeFields = {
  warehouseId: v.id("warehouses"),
  name: v.string(),
  storeType: storeTypes,
};

export const warehouseMemberFields = {
  warehouseId: v.id("warehouses"),
  userId: v.id("users"),
  // need update
  role: v.string(),
  invitedBy: v.id("users")
  // I need to add invited_at & accepted_at
};

export const productFields = {
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
    reorderPoint: v.number(), // I have an explanation of this filed in deepseek.
    criticalLow: v.number(),
    overstock: v.number()
  })
};

export const activityLogFileds = {
  userId: v.id("users"),
  warehouseId: v.id("warehouses"),
  storeId: v.id("stores"),
  productId: v.id("products"),
  // read deepseek chat to edit these two fileds
  actionType: v.string(),
  details: v.any(),
};

export const alertFileds = {
  productId: v.id("products"),
  // I need to edit this
  alertType: v.union(
    v.literal("alert_type_one"),
    v.literal("alert_type_two")
  ),
  message: v.string(),
  thresholdValue: v.number(),
  resolved: v.boolean()
};

export default defineSchema({
  users: defineTable(userFields),
  warehouses: defineTable(warehouseFields),
  warehouseMembers: defineTable(warehouseMemberFields),
  stores: defineTable(storeFields),
  products: defineTable(productFields),
  activityLogs: defineTable(activityLogFileds),
  alerts: defineTable(alertFileds)
})
