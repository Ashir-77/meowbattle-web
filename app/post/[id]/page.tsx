import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemeLikeButton from '@/components/meme-like-button'

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: currentProfile } = user
    ? await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', user.id)
        .single()
    : { data: null }

  const { data: meme } = await supabase
    .from('memes')
    .select('id, title, caption, image_url, likes_count, created_at, user_id, status')
    .eq('id', id)
    .single()

  if (!meme) {
    notFound()
  }

  const canViewHidden =
    !!user &&
    (currentProfile?.role === 'admin' || currentProfile?.id === meme.user_id)

  if (meme.status !== 'approved' && !canViewHidden) {
    notFound()
  }

  const { data: author } = await supabase
    .from('profiles')
    .select('username, display_name, role, avatar_url, bio')
    .eq('id', meme.user_id)
    .single()

  let liked = false

  if (user) {
    const { data: likedRow } = await supabase
      .from('meme_likes')
      .select('meme_id')
      .eq('user_id', user.id)
      .eq('meme_id', meme.id)
      .maybeSingle()

    liked = !!likedRow
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex gap-3">
        <Link href="/" className="rounded-xl border px-4 py-2">
          Home
        </Link>
        <Link href="/top" className="rounded-xl border px-4 py-2">
          Top
        </Link>
      </div>

      <article className="rounded-2xl border p-6">
        <div className="mb-5 flex items-center gap-4">
          {author?.avatar_url ? (
            <Link href={`/u/${author.username}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={author.avatar_url}
                alt={author.username || 'Author avatar'}
                className="h-16 w-16 rounded-full border object-cover"
              />
            </Link>
          ) : (
            <div className="h-16 w-16 rounded-full border" />
          )}

          <div>
            <div className="text-lg font-semibold">
              {author?.display_name || author?.username || 'unknown'}
            </div>

            {author?.username && (
              <div className="text-sm text-gray-500">
                <Link href={`/u/${author.username}`} className="underline">
                  @{author.username}
                </Link>
              </div>
            )}

            {author?.bio && (
              <div className="mt-1 text-sm text-gray-600">{author.bio}</div>
            )}
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <h1 className="text-4xl font-bold">{meme.title || 'Untitled meme'}</h1>

          {meme.caption && <p className="text-lg text-gray-700">{meme.caption}</p>}

          <div className="text-sm text-gray-500">
            Likes: {meme.likes_count ?? 0} · Created:{' '}
            {new Date(meme.created_at).toLocaleString()}
          </div>

          {meme.status !== 'approved' && (
            <div className="text-sm text-red-600">
              Hidden post status: {meme.status}
            </div>
          )}
        </div>

        {meme.image_url && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meme.image_url}
              alt={meme.title || 'Meme image'}
              className="max-h-[700px] rounded-xl border"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <MemeLikeButton
            memeId={meme.id}
            initialLiked={liked}
            initialLikes={meme.likes_count ?? 0}
          />

          {user && user.id !== meme.user_id && (
            <Link
              href={`/post/${meme.id}/report`}
              className="rounded-xl border px-4 py-2"
            >
              Report post
            </Link>
          )}
        </div>
      </article>
    </main>
  )
}