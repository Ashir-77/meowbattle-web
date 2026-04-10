'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MIN_TITLE_LENGTH = 3
const MIN_CAPTION_LENGTH = 5

function getFileExtension(fileName: string) {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg'
}

function sanitizeBaseName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'meme'
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(objectUrl)
    }

    img.onerror = () => {
      reject(new Error('Failed to read image dimensions'))
      URL.revokeObjectURL(objectUrl)
    }

    img.src = objectUrl
  })
}

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const previewUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!file) {
      setError('Choose an image first.')
      return
    }

    const trimmedTitle = title.trim()
    const trimmedCaption = caption.trim()

    if (!trimmedTitle && !trimmedCaption) {
      setError('Add at least a title or a caption.')
      return
    }

    if (trimmedTitle && trimmedTitle.length < MIN_TITLE_LENGTH) {
      setError(`Title must be at least ${MIN_TITLE_LENGTH} characters.`)
      return
    }

    if (trimmedCaption && trimmedCaption.length < MIN_CAPTION_LENGTH) {
      setError(`Caption must be at least ${MIN_CAPTION_LENGTH} characters.`)
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, WEBP, and GIF are allowed.')
      return
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Max size is ${MAX_FILE_SIZE_MB} MB.`)
      return
    }

    setLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('You must be logged in to upload a meme.')
      setLoading(false)
      router.push('/login')
      return
    }

    try {
      const { width, height } = await getImageDimensions(file)

      const ext = getFileExtension(file.name)
      const base = sanitizeBaseName(file.name)
      const path = `${user.id}/${Date.now()}-${base}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('memes')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from('memes')
        .getPublicUrl(path)

      const publicUrl = publicUrlData.publicUrl

      const { error: insertError } = await supabase.from('memes').insert({
        user_id: user.id,
        title: trimmedTitle || null,
        caption: trimmedCaption || null,
        image_key: path,
        image_url: publicUrl,
        width,
        height,
        status: 'pending',
      })

      if (insertError) {
        await supabase.storage.from('memes').remove([path])
        throw insertError
      }

      setMessage('Meme uploaded. It is now pending moderation.')
      setTitle('')
      setCaption('')
      setFile(null)

      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 900)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Upload meme</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
        />

        <textarea
          className="min-h-28 w-full rounded-xl border p-3"
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={240}
        />

        <input
          className="w-full rounded-xl border p-3"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl && file && (
          <div className="space-y-2 rounded-2xl border p-4">
            <div className="text-sm text-gray-600">
              Preview: {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[420px] w-auto rounded-xl border"
            />
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-xl border p-3 font-medium"
        >
          {loading ? 'Uploading...' : 'Upload meme'}
        </button>

        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
      </form>
    </main>
  )
}