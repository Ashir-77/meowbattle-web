'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MfaClientPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const next = searchParams.get('next') || '/'
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Здесь оставь или верни свою текущую MFA-логику
    // Пример ниже — просто заглушка, если хочешь не забыть место:
    try {
      // const { error } = await supabase.auth.mfa.challengeAndVerify(...)
      // if (error) throw error

      router.push(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Multi-factor authentication</h1>

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          className="w-full rounded-xl border p-3"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border p-3"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </main>
  )
}