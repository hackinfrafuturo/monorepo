import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const memberValidator = v.object({
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

export default defineSchema({
  applications: defineTable({
    submittedAt: v.number(),
    size: v.number(),
    ref: v.optional(v.string()),
  })
    .index('by_ref', ['ref'])
    .index('by_submittedAt', ['submittedAt']),
  members: defineTable({
    applicationId: v.id('applications'),
    ...memberValidator.fields,
  })
    .index('by_email', ['email'])
    .index('by_github', ['github'])
    .index('by_application', ['applicationId']),
  // Breakout on the landing: a run is timed on the server from its first launch to the win, so a time
  // can't simply be posted. A finished run becomes a score once the player names it.
  breakoutRuns: defineTable({
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  }).index('by_startedAt', ['startedAt']),
  breakoutScores: defineTable({
    name: v.string(),
    ms: v.number(),
  }).index('by_ms', ['ms']),
  // The runner on the landing: the score only depends on how long the star survives, so the server
  // times each run and caps the score it accepts at what that time allows.
  runnerRuns: defineTable({
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    score: v.optional(v.number()),
  }).index('by_startedAt', ['startedAt']),
  runnerScores: defineTable({
    name: v.string(),
    score: v.number(),
  }).index('by_score', ['score']),
})
