'use client'
import { signIn, signOut, useSession } from 'next-auth/react'

export default function AuthButton() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="auth-user-info">
        <span className="auth-user-name">{session.user?.name}</span>
        <button
          onClick={() => signOut()}
          className="auth-signout-btn"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="auth-signin-btn"
    >
      Sign in with Google
    </button>
  )
}