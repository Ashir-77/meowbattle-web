import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MemeLikeButton from '@/components/meme-like-button'

export default async function TopPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: memes } = await supabase
    .from('memes')
    .select('id, title, caption, image_url, likes_count, created_at, user_id')
    .eq('status', 'approved')
    .order('likes_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  const authorIds = [...new Set((memes ?? []).map((m) => m.user_id))]
  let authorMap = new Map<string, string>()

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds)

    authorMap = new Map((authors ?? []).map((a) => [a.id, a.username]))
  }

  const memeIds = memes?.map((m) => m.id) ?? []
  let likedIds = new Set<string>()

  if (user && memeIds.length > 0) {
    const { data: likedRows } = await supabase
      .from('meme_likes')
      .select('meme_id')
      .eq('user_id', user.id)
      .in('meme_id', memeIds)

    likedIds = new Set((likedRows ?? []).map((row) => row.meme_id))
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Top memes</h1>
          <p className="mt-2 text-gray-600">Sorted by likes</p>
        </div>

        <Link href="/" className="rounded-xl border px-4 py-2">
          Home
        </Link>
      </div>

      {!memes || memes.length === 0 ? (
        <div className="rounded-2xl border p-6 text-lg">
          No approved memes yet.
        </div>
      ) : (
        <div className="space-y-6">
          {memes.map((meme, index) => {
            const authorUsername = authorMap.get(meme.user_id)

            return (
              <article key={meme.id} className="rounded-2xl border p-4">
                <div className="mb-3">
                  <div className="text-sm text-gray-500">#{index + 1}</div>

                  <Link
                    href={`/post/${meme.id}`}
                    className="text-2xl font-semibold underline"
                  >
                    {meme.title || 'Untitled meme'}
                  </Link>

                  {meme.caption && (
                    <div className="mt-1 text-gray-700">{meme.caption}</div>
                  )}

                  <div className="mt-1 text-sm text-gray-500">
                    Likes: {meme.likes_count ?? 0} ·{' '}
                    {new Date(meme.created_at).toLocaleString()}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    Uploaded by:{' '}
                    {authorUsername ? (
                      <Link
                        href={`/u/${authorUsername}`}
                        className="underline"
                      >
                        {authorUsername}
                      </Link>
                    ) : (
                      'unknown'
                    )}
                  </div>
                </div>

                {meme.image_url && (
                  <Link href={`/post/${meme.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meme.image_url}
                      alt={meme.title || 'Meme image'}
                      className="mb-4 max-h-[600px] rounded-xl border"
                    />
                  </Link>
                )}

                <MemeLikeButton
                  memeId={meme.id}
                  initialLiked={likedIds.has(meme.id)}
                  initialLikes={meme.likes_count ?? 0}
                />
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}