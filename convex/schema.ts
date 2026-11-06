import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { STATUSES } from './admin/status'

export const statusValidator = v.union(...STATUSES.map((status) => v.literal(status)))
/** the decisions that are emailed to the team */
export const decisionValidator = v.union(v.literal('accepted'), v.literal('waitlisted'), v.literal('rejected'))
export const auditActionValidator = v.union(
  v.literal('status'),
  v.literal('review'),
  v.literal('capacity'),
  v.literal('edit'),
  v.literal('message'),
)
export const emailStateValidator = v.union(v.literal('queued'), v.literal('sent'), v.literal('skipped'), v.literal('failed'))
/** who a custom email goes to: one member, a whole team, or everyone matching a filter */
export const audienceValidator = v.union(
  v.object({ kind: v.literal('member'), memberId: v.id('members') }),
  v.object({ kind: v.literal('team'), applicationId: v.id('applications') }),
  v.object({
    kind: v.literal('group'),
    status: v.optional(statusValidator),
    ref: v.optional(v.string()),
    /** only people whose application still lacks an ID */
    missingId: v.optional(v.boolean()),
  }),
)
/** an audit entry, as stored and as the admin API returns it */
export const auditFields = {
  actor: v.string(),
  action: auditActionValidator,
  from: v.optional(statusValidator),
  to: v.optional(statusValidator),
  score: v.optional(v.number()),
  capacity: v.optional(v.number()),
  /** an applicant's correction: which answers changed, from what to what */
  changes: v.optional(v.array(v.object({ field: v.string(), from: v.string(), to: v.string() }))),
  /** a custom email: its subject and how many people it went to */
  subject: v.optional(v.string()),
  recipients: v.optional(v.number()),
}

/** The public contract used by signup and correction tabs opened before identity collection. */
export const legacyMemberValidator = v.object({
  name: v.string(),
  gender: v.union(
    v.literal('woman'),
    v.literal('man'),
    v.literal('nonbinary'),
    v.literal('other'),
    v.literal('skip'),
  ),
  github: v.string(),
  email: v.string(),
  coding: v.union(v.literal('yes'), v.literal('no')),
  linkedin: v.string(),
  site: v.string(),
  jobs: v.union(v.literal('yes'), v.literal('no')),
  role: v.string(),
  deep: v.string(),
  hardest: v.string(),
  favorite: v.string(),
  diet: v.union(v.literal('vegan'), v.literal('veggie'), v.literal('omnivore')),
  allergies: v.string(),
})

const identityFields = {
  idType: v.union(v.literal('rut'), v.literal('passport')),
  idNumber: v.string(),
  parking: v.union(v.literal('yes'), v.literal('no')),
}

export const identityMemberValidator = v.object({ ...legacyMemberValidator.fields, ...identityFields })

export const memberValidator = v.object({
  ...legacyMemberValidator.fields,
  // Required on the form since the venue's security asked for them; applications from before don't
  // have them, so they stay optional here. Only the owner and private backoffice receive the ID.
  idType: v.optional(identityFields.idType),
  idNumber: v.optional(identityFields.idNumber),
  parking: v.optional(identityFields.parking),
})

export default defineSchema({
  applications: defineTable({
    submittedAt: v.number(),
    size: v.number(),
    ref: v.optional(v.string()),
    // the team's decision (convex/admin/status.ts); absent means pending
    status: v.optional(statusValidator),
    decidedAt: v.optional(v.number()),
    /** the organizer's Tailscale login */
    decidedBy: v.optional(v.string()),
  })
    .index('by_ref', ['ref'])
    .index('by_submittedAt', ['submittedAt'])
    .index('by_status', ['status', 'submittedAt']),
  // What organizers did in the backoffice, and who did it: for attribution, not access (everyone on
  // the tailnet is an admin). `from`/`to` for a status change, `score` for a review, `capacity` for
  // the event's places.
  auditLog: defineTable({ ...auditFields, applicationId: v.optional(v.id('applications')) }).index(
    'by_application',
    ['applicationId'],
  ),
  // One organizer's score for one team (convex/admin/review.ts); scoring again replaces it.
  reviews: defineTable({
    applicationId: v.id('applications'),
    reviewer: v.string(),
    score: v.number(),
    note: v.optional(v.string()),
  })
    .index('by_application', ['applicationId'])
    .index('by_reviewer', ['reviewer', 'applicationId']),
  // Event-wide settings for the backoffice, a single row.
  settings: defineTable({
    /** places for people (not teams) */
    capacity: v.optional(v.number()),
  }),
  // Every decision email, one per member: queued when the decision is made, then sent, skipped (when
  // this deployment doesn't send decision emails, or for test addresses) or failed.
  decisionEmails: defineTable({
    applicationId: v.id('applications'),
    memberId: v.id('members'),
    decision: decisionValidator,
    actor: v.string(),
    state: emailStateValidator,
    error: v.optional(v.string()),
  }).index('by_application', ['applicationId']),
  // A custom email organizers wrote (convex/admin/messages.ts), and one row per person it goes to.
  // convex/emails.ts works through the queued rows one at a time, so a big group respects Resend's rate.
  messages: defineTable({
    actor: v.string(),
    subject: v.string(),
    body: v.string(),
    audience: audienceValidator,
    recipients: v.number(),
  }),
  messageRecipients: defineTable({
    messageId: v.id('messages'),
    applicationId: v.id('applications'),
    memberId: v.id('members'),
    state: emailStateValidator,
    error: v.optional(v.string()),
  })
    .index('by_message', ['messageId', 'state'])
    .index('by_application', ['applicationId']),
  // A private link for one applicant to correct their own answers (convex/applicationEdits.ts). Only the
  // token's hash is stored, the token itself only ever exists in the email. A new link replaces the old.
  editLinks: defineTable({
    memberId: v.id('members'),
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdBy: v.string(),
  })
    .index('by_hash', ['tokenHash'])
    .index('by_member', ['memberId']),
  members: defineTable({
    applicationId: v.id('applications'),
    ...memberValidator.fields,
  })
    .index('by_email', ['email'])
    .index('by_github', ['github'])
    .index('by_idNumber', ['idNumber'])
    .index('by_application', ['applicationId']),
  // Breakout on the landing: a run is timed on the server from its first launch to the win, so a time
  // can't simply be posted. A finished run becomes a score once the player names it.
  breakoutRuns: defineTable({
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  }).index('by_startedAt', ['startedAt']),
  // A row per named run. `handle` is the GitHub username in lowercase.
  breakoutScores: defineTable({
    name: v.string(),
    ms: v.number(),
    handle: v.optional(v.string()),
  })
    .index('by_ms', ['ms'])
    .index('by_handle', ['handle', 'ms']),
  // Each person's best, one row per `playerKey`. The board reads this, not every run.
  breakoutBests: defineTable({
    player: v.string(),
    name: v.string(),
    ms: v.number(),
  })
    .index('by_player', ['player'])
    .index('by_ms', ['ms']),
  // The runner on the landing: the browser reports the score and the server takes it as sent. A finished
  // run becomes a score once the player names it.
  runnerRuns: defineTable({
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    score: v.optional(v.number()),
    // Client-observed state-hook access, not a tamper-proof bot verdict. Absent on older rows.
    runnerHookAccessed: v.optional(v.boolean()),
  }).index('by_startedAt', ['startedAt']),
  runnerScores: defineTable({
    name: v.string(),
    score: v.number(),
    handle: v.optional(v.string()),
    runnerHookAccessed: v.optional(v.boolean()),
  })
    .index('by_score', ['score'])
    .index('by_handle', ['handle', 'score']),
  // Each person's best, one row per `playerKey`. The board reads this, not every run.
  runnerBests: defineTable({
    player: v.string(),
    name: v.string(),
    score: v.number(),
  })
    .index('by_player', ['player'])
    .index('by_score', ['score']),
})
