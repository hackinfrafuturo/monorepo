import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()
const PAGE_SIZE = 100
const MAX_PAGE_SIZE = 500
const COUNT_PAGE_SIZE = 500

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function isAuthorized(request: Request) {
  const token = process.env.CONVEX_HTTP_API_TOKEN
  if (!token) return false
  return request.headers.get('Authorization') === `Bearer ${token}`
}

const getParticipantPage = httpAction(async (ctx, request) => {
  if (!process.env.CONVEX_HTTP_API_TOKEN) {
    return json({ error: 'API authorization is not configured' }, 503)
  }
  if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(request.url)
  const rawNumItems = url.searchParams.get('numItems')
  const numItems = rawNumItems === null ? PAGE_SIZE : Number(rawNumItems)
  if (!Number.isInteger(numItems) || numItems < 1 || numItems > MAX_PAGE_SIZE) {
    return json({ error: `numItems must be an integer from 1 to ${MAX_PAGE_SIZE}` }, 400)
  }

  const cursor = url.searchParams.get('cursor')
  const result = await ctx.runQuery(internal.apiData.participantsPage, {
    paginationOpts: { numItems, cursor: cursor === null ? null : cursor },
  })

  return json(result)
})

const getCounts = httpAction(async (ctx, request) => {
  if (!process.env.CONVEX_HTTP_API_TOKEN) {
    return json({ error: 'API authorization is not configured' }, 503)
  }
  if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401)

  let submissions = 0
  let applicants = 0
  let cursor: string | null = null
  let isDone = false

  while (!isDone) {
    const result: {
      submissions: number
      applicants: number
      isDone: boolean
      continueCursor: string
    } = await ctx.runQuery(internal.apiData.applicationCountsPage, {
      paginationOpts: { numItems: COUNT_PAGE_SIZE, cursor },
    })
    submissions += result.submissions
    applicants += result.applicants
    cursor = result.continueCursor
    isDone = result.isDone
  }

  return json({ submissions, applicants })
})

http.route({ path: '/api/participants', method: 'GET', handler: getParticipantPage })
http.route({ path: '/api/applicants/count', method: 'GET', handler: getCounts })

export default http
