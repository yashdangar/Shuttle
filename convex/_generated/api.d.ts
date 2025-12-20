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
import type * as auth from "../auth.js";
import type * as bookings_index from "../bookings/index.js";
import type * as chats_index from "../chats/index.js";
import type * as cron from "../cron.js";
import type * as email_emailTemplates from "../email/emailTemplates.js";
import type * as email_index from "../email/index.js";
import type * as files_index from "../files/index.js";
import type * as hotels_index from "../hotels/index.js";
import type * as http from "../http.js";
import type * as lib_routeUtils from "../lib/routeUtils.js";
import type * as lib_seatCalculator from "../lib/seatCalculator.js";
import type * as lib_slotFinder from "../lib/slotFinder.js";
import type * as lib_tripTimeUtils from "../lib/tripTimeUtils.js";
import type * as lib_types from "../lib/types.js";
import type * as locations_index from "../locations/index.js";
import type * as notifications_index from "../notifications/index.js";
import type * as routeInstances_mutations from "../routeInstances/mutations.js";
import type * as routeInstances_queries from "../routeInstances/queries.js";
import type * as routes_index from "../routes/index.js";
import type * as shuttles_index from "../shuttles/index.js";
import type * as shuttles_mutations from "../shuttles/mutations.js";
import type * as shuttles_queries from "../shuttles/queries.js";
import type * as tripInstances_mutations from "../tripInstances/mutations.js";
import type * as tripInstances_queries from "../tripInstances/queries.js";
import type * as trips_index from "../trips/index.js";
import type * as users_index from "../users/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admins/index": typeof admins_index;
  auth: typeof auth;
  "bookings/index": typeof bookings_index;
  "chats/index": typeof chats_index;
  cron: typeof cron;
  "email/emailTemplates": typeof email_emailTemplates;
  "email/index": typeof email_index;
  "files/index": typeof files_index;
  "hotels/index": typeof hotels_index;
  http: typeof http;
  "lib/routeUtils": typeof lib_routeUtils;
  "lib/seatCalculator": typeof lib_seatCalculator;
  "lib/slotFinder": typeof lib_slotFinder;
  "lib/tripTimeUtils": typeof lib_tripTimeUtils;
  "lib/types": typeof lib_types;
  "locations/index": typeof locations_index;
  "notifications/index": typeof notifications_index;
  "routeInstances/mutations": typeof routeInstances_mutations;
  "routeInstances/queries": typeof routeInstances_queries;
  "routes/index": typeof routes_index;
  "shuttles/index": typeof shuttles_index;
  "shuttles/mutations": typeof shuttles_mutations;
  "shuttles/queries": typeof shuttles_queries;
  "tripInstances/mutations": typeof tripInstances_mutations;
  "tripInstances/queries": typeof tripInstances_queries;
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
