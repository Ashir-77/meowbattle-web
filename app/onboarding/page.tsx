'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.rpc('set_my_username', {
      p_username: username,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Выбери ник</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Ник"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          disabled={loading}
          className="w-full rounded-xl border p-3"
        >
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </main>
  )
}