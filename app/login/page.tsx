'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setError('')

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Log in</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          className="w-full rounded-xl border p-3"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <input
          className="w-full rounded-xl border p-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border p-3"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <button
        onClick={handleGoogleLogin}
        className="mt-4 w-full rounded-xl border p-3"
      >
        Continue with Google
      </button>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <Link href="/forgot-password" className="underline">
            Forgot password?
          </Link>
        </div>
        <div>
          No account yet?{' '}
          <Link href="/signup" className="underline">
            Create one
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </main>
  )
}