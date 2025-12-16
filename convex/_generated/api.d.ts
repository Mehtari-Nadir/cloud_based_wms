/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as embedding from "../embedding.js";
import type * as embeddingHelpers from "../embeddingHelpers.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as products from "../products.js";
import type * as stores from "../stores.js";
import type * as todos from "../todos.js";
import type * as users from "../users.js";
import type * as warehouses from "../warehouses.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  embedding: typeof embedding;
  embeddingHelpers: typeof embeddingHelpers;
  http: typeof http;
  invitations: typeof invitations;
  "lib/permissions": typeof lib_permissions;
  products: typeof products;
  stores: typeof stores;
  todos: typeof todos;
  users: typeof users;
  warehouses: typeof warehouses;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
