import { createServerFn } from '@tanstack/react-start'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'

export const getPublicStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const convexUrl = import.meta.env.VITE_CONVEX_URL
    if (!convexUrl) return null

    try {
      const client = new ConvexHttpClient(convexUrl)
      return await client.action(api.apiData.getPublicStats, {})
    } catch (error) {
      console.error('Unable to load public application stats:', error)
      return null
    }
  },
)
