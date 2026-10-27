import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import Leaderboard from '../Leaderboard'

export const Route = createFileRoute('/leaderboard')({
  head: () => ({
    meta: [
      { title: 'Leaderboard — Infrastructure Hackathon' },
      { name: 'description', content: 'The top ten players in Runner and Breakout. One spot per GitHub username, with your best result.' },
    ],
  }),
  component: () => <ClientOnly><Leaderboard /></ClientOnly>,
})
