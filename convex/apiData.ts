import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalAction, internalQuery } from './_generated/server'
import { memberValidator } from './schema'

const statsGroupValidator = v.object({
  submission: v.number(),
  members: v.array(v.string()),
})

const statsPageValidator = v.object({
  groups: v.array(v.object({ members: v.array(v.string()) })),
  isDone: v.boolean(),
  continueCursor: v.string(),
})

const publicStatsValidator = v.object({
  submissions: v.number(),
  applicants: v.number(),
  groups: v.array(statsGroupValidator),
})

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

export const publicStatsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: statsPageValidator,
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query('applications')
      .withIndex('by_submittedAt')
      .paginate(paginationOpts)

    const groups = await Promise.all(
      result.page.map(async (application) => {
        const members = await ctx.db
          .query('members')
          .withIndex('by_application', (q) => q.eq('applicationId', application._id))
          .take(4)

        return { members: members.map(({ name }) => name) }
      }),
    )

    return {
      groups,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    }
  },
})

export const publicStats = internalAction({
  args: {},
  returns: publicStatsValidator,
  handler: async (ctx) => {
    let cursor: string | null = null
    let isDone = false
    let submissions = 0
    let applicants = 0
    const groups: Array<{ submission: number; members: string[] }> = []

    while (!isDone) {
      const result: {
        groups: Array<{ members: string[] }>
        isDone: boolean
        continueCursor: string
      } = await ctx.runQuery(internal.apiData.publicStatsPage, {
        paginationOpts: { numItems: 100, cursor },
      })

      for (const group of result.groups) {
        submissions += 1
        applicants += group.members.length
        groups.push({ submission: submissions, members: group.members })
      }

      cursor = result.continueCursor
      isDone = result.isDone
    }

    return { submissions, applicants, groups }
  },
})

export const getPublicStats = action({
  args: {},
  returns: publicStatsValidator,
  handler: async (ctx): Promise<{
    submissions: number
    applicants: number
    groups: Array<{ submission: number; members: string[] }>
  }> => ctx.runAction(internal.apiData.publicStats, {}),
})
