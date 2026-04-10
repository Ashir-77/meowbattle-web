'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TurnstileBox from '@/components/turnstile-box'

export default function SignupClientPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const next = searchParams.get('next') || '/onboarding'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!captchaToken) {
      setError('Complete the captcha first.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        captchaToken,
      },
    })

    setLoading(false)
    setCaptchaResetKey((prev) => prev + 1)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Check your email and confirm your signup.')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleGoogleSignup() {
    setError('')
    setMessage('')

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

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
      <h1 className="mb-6 text-3xl font-bold">Create account</h1>

      <form onSubmit={handleSignup} className="space-y-4">
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
          autoComplete="new-password"
          required
        />

        <input
          className="w-full rounded-xl border p-3"
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <TurnstileBox
          onTokenChange={setCaptchaToken}
          resetKey={captchaResetKey}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border p-3"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <button
        onClick={handleGoogleSignup}
        className="mt-4 w-full rounded-xl border p-3"
      >
        Continue with Google
      </button>

      <div className="mt-4 text-sm">
        Already have an account?{' '}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline">
          Log in
        </Link>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </main>
  )
}