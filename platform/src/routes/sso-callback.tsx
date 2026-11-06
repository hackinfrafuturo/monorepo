import { HandleSSOCallback } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/sso-callback')({ component: Callback })

function Callback() {
  const [failed, setFailed] = useState(false)
  return (
    <main className="auth-screen">
      {failed ? (
        <>
          <p role="alert">Discord sign-in could not be completed.</p>
          <Link to="/">Try again</Link>
        </>
      ) : (
        <HandleSSOCallback
          navigateToApp={({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setFailed(true)
              return
            }
            // A full navigation makes the server recheck the newly created session.
            window.location.replace(decorateUrl('/dashboard'))
          }}
          navigateToSignIn={() => setFailed(true)}
          navigateToSignUp={() => setFailed(true)}
        />
      )}
    </main>
  )
}
