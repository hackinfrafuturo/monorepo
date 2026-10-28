import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { internalQuery } from './_generated/server'
import { memberValidator } from './schema'

const participantDocumentValidator = v.object({
  _id: v.id('members'),
  _creationTime: v.number(),
  applicationId: v.id('applications'),
  ...memberValidator.fields,
})

export const participantsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(participantDocumentValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query('members')
      .withIndex('by_email')
      .paginate(paginationOpts)

    return {
      page: result.page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

export const applicationCountsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    submissions: v.number(),
    applicants: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query('applications')
      .withIndex('by_submittedAt')
      .paginate(paginationOpts)

    return {
      submissions: result.page.length,
      applicants: result.page.reduce((total, application) => total + application.size, 0),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})
