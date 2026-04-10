'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BetaPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUserEmail(user.email ?? null)

      const { data: profile } = await supabase
        .from('profiles')
        .select('beta_access, role')
        .eq('id', user.id)
        .single()

      const allowed = !!profile?.beta_access || profile?.role === 'admin'
      setHasAccess(allowed)

      if (allowed) {
        router.replace('/')
        router.refresh()
        return
      }

      setLoading(false)
    }

    load()
  }, [router, supabase])

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    const { error } = await supabase.rpc('redeem_beta_invite', {
      p_code: code,
    })

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Invite code accepted.')
    router.replace('/')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="mb-4 text-4xl font-bold">Closed beta</h1>
        <p>Loading...</p>
      </main>
    )
  }

  if (!userEmail) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="mb-4 text-4xl font-bold">Closed beta</h1>
        <p className="mb-6 text-lg text-gray-600">
          MeowBattle is currently in private testing.
          Sign up or log in first, then enter your invite code.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/login?next=/beta" className="rounded-xl border px-4 py-2">
            Log in
          </Link>
          <Link href="/signup?next=/beta" className="rounded-xl border px-4 py-2">
            Sign up
          </Link>
        </div>
      </main>
    )
  }

  if (hasAccess) {
    return null
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-4xl font-bold">Closed beta</h1>
      <p className="mb-2 text-gray-600">Logged in as: {userEmail}</p>
      <p className="mb-6 text-lg text-gray-600">
        Enter your invite code to unlock access to MeowBattle.
      </p>

      <form onSubmit={handleRedeem} className="space-y-4">
        <input
          className="w-full rounded-xl border p-3"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter invite code"
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl border p-3"
        >
          {submitting ? 'Checking code...' : 'Unlock beta access'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </main>
  )
}