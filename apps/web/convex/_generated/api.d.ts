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
import type * as categories from "../categories.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as entries from "../entries.js";
import type * as fallbackNotifications from "../fallbackNotifications.js";
import type * as http from "../http.js";
import type * as interrupts from "../interrupts.js";
import type * as invitations from "../invitations.js";
import type * as invitationsHelpers from "../invitationsHelpers.js";
import type * as invitationsHttp from "../invitationsHttp.js";
import type * as lib_notificationHelpers from "../lib/notificationHelpers.js";
import type * as migrations from "../migrations.js";
import type * as orgContext from "../orgContext.js";
import type * as organizations from "../organizations.js";
import type * as personalClients from "../personalClients.js";
import type * as personalEntries from "../personalEntries.js";
import type * as personalProjects from "../personalProjects.js";
import type * as projects from "../projects.js";
import type * as pushActions from "../pushActions.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as router from "../router.js";
import type * as sendEmails from "../sendEmails.js";
import type * as timer from "../timer.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  categories: typeof categories;
  clients: typeof clients;
  crons: typeof crons;
  entries: typeof entries;
  fallbackNotifications: typeof fallbackNotifications;
  http: typeof http;
  interrupts: typeof interrupts;
  invitations: typeof invitations;
  invitationsHelpers: typeof invitationsHelpers;
  invitationsHttp: typeof invitationsHttp;
  "lib/notificationHelpers": typeof lib_notificationHelpers;
  migrations: typeof migrations;
  orgContext: typeof orgContext;
  organizations: typeof organizations;
  personalClients: typeof personalClients;
  personalEntries: typeof personalEntries;
  personalProjects: typeof personalProjects;
  projects: typeof projects;
  pushActions: typeof pushActions;
  pushNotifications: typeof pushNotifications;
  router: typeof router;
  sendEmails: typeof sendEmails;
  timer: typeof timer;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          complained: boolean;
          createdAt: number;
          errorMessage?: string;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject: string;
          text?: string;
          to: string;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          complained: boolean;
          errorMessage: string | null;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject: string;
          text?: string;
          to: string;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
