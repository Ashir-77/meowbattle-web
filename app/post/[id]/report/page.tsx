'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReportPostPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase.rpc('create_post_report', {
      p_meme_id: params.id,
      p_reason: reason,
      p_details: details.trim() || null,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Report submitted.')
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => router.push(`/post/${params.id}`)}
          className="rounded-xl border px-4 py-2"
        >
          Back to post
        </button>
        <button
          onClick={() => router.push('/')}
          className="rounded-xl border px-4 py-2"
        >
          Home
        </button>
      </div>

      <h1 className="mb-6 text-3xl font-bold">Report post</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          className="w-full rounded-xl border p-3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="spam">Spam</option>
          <option value="stolen_content">Stolen content</option>
          <option value="abuse">Abuse</option>
          <option value="other">Other</option>
        </select>

        <textarea
          className="w-full rounded-xl border p-3"
          rows={5}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Optional details"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border p-3"
        >
          {loading ? 'Sending...' : 'Send report'}
        </button>

        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
      </form>
    </main>
  )
}