import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dictionaries, isValidLanguage, type AppLanguage } from '@/lib/i18n/dictionaries'
import MemeLikeButton from '@/components/meme-like-button'

export default async function HomePage() {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('username, role, preferred_language')
        .eq('id', user.id)
        .single()
    : { data: null }

  const cookieLang = cookieStore.get('mb_lang')?.value
  const resolvedLang: AppLanguage =
    (profile?.preferred_language as AppLanguage | null) ||
    (cookieLang && isValidLanguage(cookieLang) ? cookieLang : 'en')

  const t = dictionaries[resolvedLang]

  const { data: memes } = await supabase
    .from('memes')
    .select('id, title, caption, image_url, likes_count, created_at, user_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(30)

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
    <main className="min-h-screen bg-white p-8 text-black">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-4xl font-bold">{t.title}</h1>
        <p className="text-lg text-gray-600">{t.subtitle}</p>

        <div className="flex flex-wrap gap-4">
          {!user ? (
            <>
              <Link href="/login" className="rounded-xl border px-4 py-2">
                {t.login}
              </Link>
              <Link href="/signup" className="rounded-xl border px-4 py-2">
                {t.signup}
              </Link>
            </>
          ) : (
            <>
              <Link href="/upload" className="rounded-xl border px-4 py-2">
                {t.upload}
              </Link>
              <Link href="/battle" className="rounded-xl border px-4 py-2">
                {t.battles}
              </Link>
              <Link href="/top" className="rounded-xl border px-4 py-2">
                {t.top}
              </Link>
              <Link href="/security" className="rounded-xl border px-4 py-2">
                Security
              </Link>
              {profile?.role === 'admin' && (
                <Link href="/admin" className="rounded-xl border px-4 py-2">
                  Admin
                </Link>
              )}
            </>
          )}

          <Link href="/settings" className="rounded-xl border px-4 py-2">
            {t.settings}
          </Link>
        </div>

        <div className="rounded-2xl border p-4">
          <div>
            {t.user}: {profile?.username ?? t.guest}
          </div>
          <div>
            {t.role}: {profile?.role ?? 'none'}
          </div>
        </div>

        <section className="space-y-4 pt-4">
          <h2 className="text-2xl font-bold">Latest approved memes</h2>

          {!memes || memes.length === 0 ? (
            <div className="rounded-2xl border p-6 text-lg">
              No approved memes yet.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {memes.map((meme) => {
                const authorUsername = authorMap.get(meme.user_id)

                return (
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
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}