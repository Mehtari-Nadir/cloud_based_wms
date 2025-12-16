import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const userFields = {
  name: v.string(),
  email: v.string(),
  clerkId: v.string(),
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

// Role types for RBAC
export const roleTypes = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("staff")
);

export const warehouseMemberFields = {
  warehouseId: v.id("warehouses"),
  userId: v.id("users"),
  role: roleTypes,
  invitedBy: v.optional(v.id("users")),
  joinedAt: v.number(),
};

// Invitation status
export const invitationStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined")
);

export const invitationFields = {
  warehouseId: v.id("warehouses"),
  email: v.string(),
  role: roleTypes,
  invitedBy: v.id("users"),
  status: invitationStatus,
  invitedAt: v.number(),
};

export const productFields = {
  storeId: v.id("stores"),
  name: v.string(),
  sku: v.string(),
  description: v.string(),
  quantity: v.number(),
  unit: v.string(),
  price: v.string(),
  imageId: v.optional(v.id("_storage")), // Optional product image
  embedding: v.optional(v.array(v.float64())), // Vector embedding for semantic search
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
  users: defineTable(userFields)
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),
  warehouses: defineTable(warehouseFields).index("by_warehouse_name", ["name"]),
  warehouseMembers: defineTable(warehouseMemberFields)
    .index("by_warehouse", ["warehouseId"])
    .index("by_user", ["userId"])
    .index("by_warehouse_and_user", ["warehouseId", "userId"]),
  invitations: defineTable(invitationFields)
    .index("by_email", ["email"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_email_and_warehouse", ["email", "warehouseId"]),
  stores: defineTable(storeFields)
    .index("by_warehouse_id", ["warehouseId"]),
  products: defineTable(productFields)
    .index("by_store", ["storeId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768, // Google text-embedding-004 dimensions
      filterFields: ["storeId"],
    }),
  activityLogs: defineTable(activityLogFileds),
  alerts: defineTable(alertFileds),

  // I will remove this code
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
})
