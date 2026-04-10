'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type TotpFactor = {
  id: string
  status: string
  friendly_name?: string | null
}

export default function SecurityPage() {
  const supabase = createClient()
  const router = useRouter()

  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [nextLevel, setNextLevel] = useState<string | null>(null)
  const [verifiedFactor, setVerifiedFactor] = useState<TotpFactor | null>(null)

  const [enrollingFactorId, setEnrollingFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [verifyCode, setVerifyCode] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSecurityState()
  }, [])

  async function loadSecurityState() {
    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (!aal.error) {
      setCurrentLevel(aal.data?.currentLevel ?? null)
      setNextLevel(aal.data?.nextLevel ?? null)
    }

    const factors = await supabase.auth.mfa.listFactors()
    if (!factors.error) {
      const verified =
        factors.data.totp.find((factor) => factor.status === 'verified') ?? null
      setVerifiedFactor(verified as TotpFactor | null)
    }
  }

  async function handleStartEnrollment() {
    setError('')
    setMessage('')
    setLoading(true)

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setEnrollingFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setLoading(false)
  }

  async function handleVerifyEnrollment(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (!enrollingFactorId) {
      setError('No pending MFA enrollment.')
      setLoading(false)
      return
    }

    const challenge = await supabase.auth.mfa.challenge({
      factorId: enrollingFactorId,
    })

    if (challenge.error) {
      setError(challenge.error.message)
      setLoading(false)
      return
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: enrollingFactorId,
      challengeId: challenge.data.id,
      code: verifyCode.trim(),
    })

    if (verify.error) {
      setError(verify.error.message)
      setLoading(false)
      return
    }

    setMessage('Two-factor authentication enabled.')
    setEnrollingFactorId(null)
    setQrCode('')
    setVerifyCode('')
    await loadSecurityState()
    setLoading(false)
    router.refresh()
  }

  async function handleDisableMFA() {
    setError('')
    setMessage('')
    setLoading(true)

    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal.data?.currentLevel !== 'aal2') {
      router.push('/mfa?next=/security')
      return
    }

    if (!verifiedFactor) {
      setError('No verified factor found.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage('Two-factor authentication disabled.')
    setVerifiedFactor(null)
    await loadSecurityState()
    setLoading(false)
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => router.push('/settings')}
          className="rounded-xl border px-4 py-2"
        >
          Settings
        </button>
        <button
          onClick={() => router.push('/')}
          className="rounded-xl border px-4 py-2"
        >
          Home
        </button>
      </div>

      <h1 className="mb-6 text-3xl font-bold">Security</h1>

      <div className="mb-6 rounded-2xl border p-4 space-y-2">
        <div>Current AAL: {currentLevel ?? 'unknown'}</div>
        <div>Next AAL: {nextLevel ?? 'unknown'}</div>
        <div>MFA status: {verifiedFactor ? 'enabled' : 'disabled'}</div>
      </div>

      {!verifiedFactor && !enrollingFactorId && (
        <button
          onClick={handleStartEnrollment}
          disabled={loading}
          className="w-full rounded-xl border p-3"
        >
          {loading ? 'Preparing...' : 'Set up authenticator app'}
        </button>
      )}

      {!verifiedFactor && enrollingFactorId && (
        <form onSubmit={handleVerifyEnrollment} className="space-y-4 rounded-2xl border p-4">
          <div className="text-lg font-semibold">Scan this QR code</div>

          {qrCode && (
            <div className="rounded-xl border p-4 inline-block bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="MFA QR code" />
            </div>
          )}

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Enter 6-digit code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
          />

          <button
            disabled={loading}
            className="w-full rounded-xl border p-3"
          >
            {loading ? 'Enabling...' : 'Enable 2FA'}
          </button>
        </form>
      )}

      {verifiedFactor && (
        <div className="space-y-4 rounded-2xl border p-4">
          <div className="text-lg font-semibold">Authenticator app is enabled</div>
          <button
            onClick={handleDisableMFA}
            disabled={loading}
            className="w-full rounded-xl border p-3"
          >
            {loading ? 'Working...' : 'Disable 2FA'}
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </main>
  )
}