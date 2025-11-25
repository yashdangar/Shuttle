/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admins_index from "../admins/index.js";
import type * as auth_index from "../auth/index.js";
import type * as chats_index from "../chats/index.js";
import type * as email_emailTemplates from "../email/emailTemplates.js";
import type * as email_index from "../email/index.js";
import type * as files_index from "../files/index.js";
import type * as hotels_index from "../hotels/index.js";
import type * as http from "../http.js";
import type * as locations_index from "../locations/index.js";
import type * as notifications_index from "../notifications/index.js";
import type * as shuttles_index from "../shuttles/index.js";
import type * as trips_index from "../trips/index.js";
import type * as users_index from "../users/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admins/index": typeof admins_index;
  "auth/index": typeof auth_index;
  "chats/index": typeof chats_index;
  "email/emailTemplates": typeof email_emailTemplates;
  "email/index": typeof email_index;
  "files/index": typeof files_index;
  "hotels/index": typeof hotels_index;
  http: typeof http;
  "locations/index": typeof locations_index;
  "notifications/index": typeof notifications_index;
  "shuttles/index": typeof shuttles_index;
  "trips/index": typeof trips_index;
  "users/index": typeof users_index;
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
