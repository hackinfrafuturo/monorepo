import { SignOutButton, UserButton } from '@clerk/tanstack-react-start'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const getAccount = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()
  if (!userId) {
    throw redirect({ to: '/' })
  }

  const user = await clerkClient().users.getUser(userId)
  const discord = user.externalAccounts.find(
    (account) => account.provider === 'oauth_discord' || account.provider === 'discord',
  )

  // Never serialize provider access tokens or the full user.
  return {
    name: user.firstName ?? user.username ?? 'Participant',
    discordId: discord?.providerUserId ?? null,
    discordUsername: discord?.username ?? null,
  }
})

export const Route = createFileRoute('/_authenticated/dashboard')({
  loader: () => getAccount(),
  component: Account,
})

function Account() {
  const account = Route.useLoaderData()
  return (
    <main>
      <header>
        <Link to="/">Hackathon</Link>
        <div className="account-actions">
          <UserButton />
          <SignOutButton redirectUrl="/">
            <button type="button">Log out</button>
          </SignOutButton>
        </div>
      </header>
      <p className="eyebrow">Participant dashboard</p>
      <h1>Welcome, {account.name}.</h1>
      {account.discordId ? (
        <section>
          <h2>Discord connected</h2>
          {account.discordUsername && <p>{account.discordUsername}</p>}
          <p>Discord ID: <code>{account.discordId}</code></p>
        </section>
      ) : (
        <p>No Discord account is connected yet.</p>
      )}
    </main>
  )
}
