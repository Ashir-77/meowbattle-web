'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MfaClientPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const next = searchParams.get('next') || '/'
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkAAL() {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (data?.currentLevel === 'aal2') {
        router.replace(next)
        router.refresh()
      }
    }

    checkAAL()
  }, [next, router, supabase])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const factors = await supabase.auth.mfa.listFactors()
    if (factors.error) {
      setError(factors.error.message)
      setLoading(false)
      return
    }

    const totpFactor =
      factors.data.totp.find((factor) => factor.status === 'verified') ||
      factors.data.totp[0]

    if (!totpFactor) {
      setError('No TOTP factor found.')
      setLoading(false)
      return
    }

    const challenge = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    })

    if (challenge.error) {
      setError(challenge.error.message)
      setLoading(false)
      return
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.data.id,
      code: code.trim(),
    })

    if (verify.error) {
      setError(verify.error.message)
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Two-factor authentication</h1>
      <p className="mb-4 text-gray-600">
        Enter the 6-digit code from your authenticator app.
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          className="w-full rounded-xl border p-3"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />

        <button disabled={loading} className="w-full rounded-xl border p-3">
          {loading ? 'Verifying...' : 'Verify code'}
        </button>

        {error && <p className="text-red-600">{error}</p>}
      </form>
    </main>
  )
}