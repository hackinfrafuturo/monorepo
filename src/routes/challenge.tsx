import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import Challenge from '../Challenge'

export const Route = createFileRoute('/challenge')({
  head: () => ({
    meta: [
      { title: 'Velum Labs GPU Challenge — Infrastructure Hackathon' },
      {
        name: 'description',
        content:
          'Make agents faster. Three weeks online before the hackathon, $10,000 USD in cash and AI credits from Velum Labs.',
      },
    ],
  }),
  component: ChallengeRoute,
})

function ChallengeRoute() {
  return (
    <ClientOnly>
      <Challenge />
    </ClientOnly>
  )
}
