import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

const requireUser = createServerFn({ method: 'GET' }).handler(async () => {
  const { userId } = await auth()
  if (!userId) throw redirect({ to: '/' })
  return { userId }
})

// A pathless layout protects every participant route before its loader runs.
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => requireUser(),
  component: Outlet,
})
