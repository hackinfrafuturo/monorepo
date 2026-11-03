import { ConvexError, v } from 'convex/values'
import { internal } from '../_generated/api'
import { mutation } from '../_generated/server'
import { statusValidator } from '../schema'
import { adminArgs, requireAdmin } from './auth'
import { STATUS_DECISIONS, canMove, statusOf } from './status'

/** teams per decision, to keep one confirmation readable and one transaction small */
const BATCH = 100
const EMAIL_SPACING_MS = 600

/**
 * Moves one or more teams to a status and logs who did it. Accepting, waitlisting or rejecting queues
 * the matching email to every member of the team (convex/emails.ts sends it, or records why not). All
 * or nothing: if any team can't make the move, nothing changes.
 */
export const decide = mutation({
  args: { ...adminArgs, applicationIds: v.array(v.id('applications')), status: statusValidator },
  returns: v.object({ changed: v.number(), emails: v.number() }),
  handler: async (ctx, { applicationIds, status, ...args }) => {
    const actor = requireAdmin(args)
    const ids = [...new Set(applicationIds)]
    if (!ids.length || ids.length > BATCH) throw new ConvexError(`Choose 1 to ${BATCH} teams`)
    const applications = await Promise.all(ids.map((id) => ctx.db.get(id)))
    for (const application of applications) {
      if (!application) throw new ConvexError('Application not found')
      const from = statusOf(application)
      if (from !== status && !canMove(from, status))
        throw new ConvexError(`Can't move an application from ${from} to ${status}`)
    }
    const decision = STATUS_DECISIONS.find((d) => d === status)
    let changed = 0
    let emails = 0
    for (const application of applications) {
      if (!application) continue
      const from = statusOf(application)
      if (from === status) continue
      await ctx.db.patch(application._id, { status, decidedAt: Date.now(), decidedBy: actor })
      await ctx.db.insert('auditLog', { actor, action: 'status', applicationId: application._id, from, to: status })
      changed++
      if (!decision) continue
      const members = await ctx.db
        .query('members')
        .withIndex('by_application', (q) => q.eq('applicationId', application._id))
        .take(4)
      for (const member of members) {
        const emailId = await ctx.db.insert('decisionEmails', {
          applicationId: application._id,
          memberId: member._id,
          decision,
          actor,
          state: 'queued',
        })
        // spaced out: Resend refuses more than a few a second, and a big batch would mostly fail
        await ctx.scheduler.runAfter(emails * EMAIL_SPACING_MS, internal.emails.sendDecision, { emailId })
        emails++
      }
    }
    return { changed, emails }
  },
})
