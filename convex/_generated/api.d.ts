/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as entries from "../entries.js";
import type * as http from "../http.js";
import type * as interrupts from "../interrupts.js";
import type * as invitations from "../invitations.js";
import type * as orgContext from "../orgContext.js";
import type * as organizations from "../organizations.js";
import type * as projects from "../projects.js";
import type * as router from "../router.js";
import type * as timer from "../timer.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clients: typeof clients;
  crons: typeof crons;
  entries: typeof entries;
  http: typeof http;
  interrupts: typeof interrupts;
  invitations: typeof invitations;
  orgContext: typeof orgContext;
  organizations: typeof organizations;
  projects: typeof projects;
  router: typeof router;
  timer: typeof timer;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
