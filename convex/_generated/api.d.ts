/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as measurements from "../measurements.js";
import type * as nutrition from "../nutrition.js";
import type * as permissions from "../permissions.js";
import type * as profileBootstrap from "../profileBootstrap.js";
import type * as profiles from "../profiles.js";
import type * as projections from "../projections.js";
import type * as rateLimit from "../rateLimit.js";
import type * as social from "../social.js";
import type * as validation from "../validation.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  dashboard: typeof dashboard;
  http: typeof http;
  measurements: typeof measurements;
  nutrition: typeof nutrition;
  permissions: typeof permissions;
  profileBootstrap: typeof profileBootstrap;
  profiles: typeof profiles;
  projections: typeof projections;
  rateLimit: typeof rateLimit;
  social: typeof social;
  validation: typeof validation;
  workouts: typeof workouts;
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
