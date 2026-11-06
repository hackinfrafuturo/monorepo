import { useSignIn } from '@clerk/tanstack-react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'

const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()
  return { userId }
})

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { userId } = await getSession()
    if (userId) throw redirect({ to: '/dashboard' })
  },
  component: Login,
})

function Login() {
  const { signIn, fetchStatus } = useSignIn()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithDiscord() {
    if (!signIn || pending) return
    setPending(true)
    setError(null)
    try {
      const result = await signIn.sso({
        strategy: 'oauth_discord',
        redirectUrl: '/dashboard',
        redirectCallbackUrl: '/sso-callback',
      })
      if (result.error) throw result.error
    } catch {
      setError('Could not connect to Discord. Please try again.')
      setPending(false)
    }
  }

  return (
    <main className="auth-screen">
      <button
        className="discord-button"
        disabled={!signIn || pending || fetchStatus === 'fetching'}
        onClick={signInWithDiscord}
      >
        {pending ? 'Connecting to Discord…' : 'Continue with Discord'}
      </button>
      {error && <p role="alert">{error}</p>}
    </main>
  )
}
