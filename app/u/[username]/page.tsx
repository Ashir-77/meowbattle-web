import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MemeLikeButton from '@/components/meme-like-button'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const normalizedUsername = decodeURIComponent(username).toLowerCase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, role, avatar_url')
    .eq('username', normalizedUsername)
    .single()

  if (!profile) {
    notFound()
  }

  const { data: memes } = await supabase
    .from('memes')
    .select('id, title, caption, image_url, likes_count, created_at')
    .eq('user_id', profile.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

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

  const isOwnProfile = user?.id === profile.id

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex gap-3">
        <Link href="/" className="rounded-xl border px-4 py-2">
          Home
        </Link>
        <Link href="/top" className="rounded-xl border px-4 py-2">
          Top
        </Link>
        {isOwnProfile && (
          <Link href="/edit-profile" className="rounded-xl border px-4 py-2">
            Edit profile
          </Link>
        )}
      </div>

      <section className="mb-8 rounded-2xl border p-6">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-20 w-20 rounded-full border object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full border" />
          )}

          <div>
            <h1 className="text-4xl font-bold">
              {profile.display_name || profile.username}
            </h1>
            <div className="mt-1 text-gray-600">@{profile.username}</div>
            <div className="mt-1 text-gray-600">Role: {profile.role}</div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 max-w-2xl text-lg text-gray-700">{profile.bio}</p>
        )}

        <div className="mt-3 text-gray-600">
          Approved memes: {memes?.length ?? 0}
        </div>
      </section>

      {!memes || memes.length === 0 ? (
        <div className="rounded-2xl border p-6 text-lg">
          This user has no approved memes yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {memes.map((meme) => (
            <article key={meme.id} className="rounded-2xl border p-4">
              <div className="mb-3">
                <Link
                  href={`/post/${meme.id}`}
                  className="text-xl font-semibold underline"
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
              </div>

              {meme.image_url && (
                <Link href={`/post/${meme.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meme.image_url}
                    alt={meme.title || 'Meme image'}
                    className="mb-4 max-h-[500px] rounded-xl border"
                  />
                </Link>
              )}

              <MemeLikeButton
                memeId={meme.id}
                initialLiked={likedIds.has(meme.id)}
                initialLikes={meme.likes_count ?? 0}
              />
            </article>
          ))}
        </div>
      )}
    </main>
  )
}