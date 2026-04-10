'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EditProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setUsername(profile?.username ?? '')
      setDisplayName(profile?.display_name ?? '')
      setBio(profile?.bio ?? '')
      setAvatarUrl(profile?.avatar_url ?? '')
      setLoading(false)
    }

    load()
  }, [router, supabase])

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile)
    }
    return avatarUrl
  }, [avatarFile, avatarUrl])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!userId) return

    if (!/^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase())) {
      setError('Username must be 3-20 chars and use only a-z, 0-9, _.')
      return
    }

    if (displayName.trim().length > 40) {
      setError('Display name is too long.')
      return
    }

    if (bio.trim().length > 180) {
      setError('Bio is too long.')
      return
    }

    setSaving(true)

    let uploadedAvatarUrl: string | null = null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `avatars/${userId}/${Date.now()}.${ext}`

      const upload = await supabase.storage.from('memes').upload(path, avatarFile, {
        upsert: false,
      })

      if (upload.error) {
        setSaving(false)
        setError(upload.error.message)
        return
      }

      const { data } = supabase.storage.from('memes').getPublicUrl(path)
      uploadedAvatarUrl = data.publicUrl
    }

    const { error } = await supabase.rpc('set_my_profile', {
      p_username: username.trim().toLowerCase(),
      p_display_name: displayName.trim() || null,
      p_bio: bio.trim() || null,
      p_avatar_url: uploadedAvatarUrl,
    })

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Profile updated.')
    router.push(`/u/${username.trim().toLowerCase()}`)
    router.refresh()
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="text-xl">Loading profile...</div>
      </main>
    )
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

      <h1 className="mb-6 text-4xl font-bold">Edit profile</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">Username</label>
          <input
            className="w-full rounded-xl border p-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
          <p className="mt-1 text-sm text-gray-500">
            3-20 chars, only a-z, 0-9, _
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Display name</label>
          <input
            className="w-full rounded-xl border p-3"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Bio</label>
          <textarea
            className="w-full rounded-xl border p-3"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people something about yourself"
          />
          <p className="mt-1 text-sm text-gray-500">{bio.length}/180</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Avatar</label>

          {avatarPreview ? (
            <div className="mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-28 w-28 rounded-full border object-cover"
              />
            </div>
          ) : null}

          <input
            className="w-full rounded-xl border p-3"
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-sm text-gray-500">
            For now avatar uploads use your existing memes bucket.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl border p-3"
        >
          {saving ? 'Saving...' : 'Save profile'}
        </button>

        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
      </form>
    </main>
  )
}