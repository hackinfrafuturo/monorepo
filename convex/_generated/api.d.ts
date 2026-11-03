/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_activity from "../admin/activity.js";
import type * as admin_applications from "../admin/applications.js";
import type * as admin_auth from "../admin/auth.js";
import type * as admin_decisions from "../admin/decisions.js";
import type * as admin_emailTemplates from "../admin/emailTemplates.js";
import type * as admin_messages from "../admin/messages.js";
import type * as admin_overview from "../admin/overview.js";
import type * as admin_review from "../admin/review.js";
import type * as admin_settings from "../admin/settings.js";
import type * as admin_stats from "../admin/stats.js";
import type * as admin_status from "../admin/status.js";
import type * as apiData from "../apiData.js";
import type * as applicationEdits from "../applicationEdits.js";
import type * as applications from "../applications.js";
import type * as breakout from "../breakout.js";
import type * as crons from "../crons.js";
import type * as decisionEmails from "../decisionEmails.js";
import type * as emails from "../emails.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as runner from "../runner.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/activity": typeof admin_activity;
  "admin/applications": typeof admin_applications;
  "admin/auth": typeof admin_auth;
  "admin/decisions": typeof admin_decisions;
  "admin/emailTemplates": typeof admin_emailTemplates;
  "admin/messages": typeof admin_messages;
  "admin/overview": typeof admin_overview;
  "admin/review": typeof admin_review;
  "admin/settings": typeof admin_settings;
  "admin/stats": typeof admin_stats;
  "admin/status": typeof admin_status;
  apiData: typeof apiData;
  applicationEdits: typeof applicationEdits;
  applications: typeof applications;
  breakout: typeof breakout;
  crons: typeof crons;
  decisionEmails: typeof decisionEmails;
  emails: typeof emails;
  github: typeof github;
  http: typeof http;
  messages: typeof messages;
  runner: typeof runner;
  seed: typeof seed;
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
