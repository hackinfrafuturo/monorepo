import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.daily('sweep stale breakout runs', { hourUTC: 7, minuteUTC: 0 }, internal.breakout.sweep, {})

export default crons
