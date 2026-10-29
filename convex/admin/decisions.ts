import { ConvexError, v } from 'convex/values'
import { mutation } from '../_generated/server'
import { statusValidator } from '../schema'
import { adminArgs, requireAdmin } from './auth'
import { canMove, statusOf } from './status'

/**
 * Moves a team to another status and logs who did it. Sending the decision email is not wired in yet:
 * that comes with the decisions screen, which should call this, never patch `status` itself.
 */
export const setStatus = mutation({
  args: { ...adminArgs, applicationId: v.id('applications'), status: statusValidator },
  returns: v.null(),
  handler: async (ctx, { applicationId, status, ...args }) => {
    const actor = requireAdmin(args)
    const application = await ctx.db.get(applicationId)
    if (!application) throw new ConvexError('Application not found')
    const from = statusOf(application)
    if (from === status) return null
    if (!canMove(from, status)) throw new ConvexError(`Can't move an application from ${from} to ${status}`)
    await ctx.db.patch(applicationId, { status, decidedAt: Date.now(), decidedBy: actor })
    await ctx.db.insert('auditLog', { actor, action: 'status', applicationId, from, to: status })
    return null
  },
})
