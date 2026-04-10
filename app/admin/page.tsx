import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdminAAL2() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/mfa?next=/admin')
  }

  return { supabase, user }
}

async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminUserId: string,
  targetMemeId: string,
  action: 'approve' | 'reject' | 'delete'
) {
  await supabase.from('admin_actions').insert({
    admin_user_id: adminUserId,
    target_meme_id: targetMemeId,
    action,
    details: {
      source: 'admin-page',
    },
  })
}

async function approveMeme(formData: FormData) {
  'use server'

  const memeId = String(formData.get('memeId') || '')
  if (!memeId) return

  const { supabase, user } = await requireAdminAAL2()

  const { error } = await supabase
    .from('memes')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      rejected_reason: null,
    })
    .eq('id', memeId)

  if (!error) {
    await logAdminAction(supabase, user.id, memeId, 'approve')
  }

  redirect('/admin')
}

async function rejectMeme(formData: FormData) {
  'use server'

  const memeId = String(formData.get('memeId') || '')
  if (!memeId) return

  const { supabase, user } = await requireAdminAAL2()

  const { error } = await supabase
    .from('memes')
    .update({
      status: 'rejected',
      rejected_reason: 'Rejected by admin',
    })
    .eq('id', memeId)

  if (!error) {
    await logAdminAction(supabase, user.id, memeId, 'reject')
  }

  redirect('/admin')
}

async function deleteMeme(formData: FormData) {
  'use server'

  const memeId = String(formData.get('memeId') || '')
  if (!memeId) return

  const { supabase, user } = await requireAdminAAL2()

  const { data: meme } = await supabase
    .from('memes')
    .select('image_key')
    .eq('id', memeId)
    .single()

  if (meme?.image_key) {
    await supabase.storage.from('memes').remove([meme.image_key])
  }

  const { error } = await supabase.from('memes').delete().eq('id', memeId)

  if (!error) {
    await logAdminAction(supabase, user.id, memeId, 'delete')
  }

  redirect('/admin')
}

export default async function AdminPage() {
  const { supabase } = await requireAdminAAL2()

  const { data: memes, error } = await supabase
    .from('memes')
    .select('id, title, caption, image_url, status, created_at, user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: recentActions } = await supabase
    .from('admin_actions')
    .select('id, action, target_meme_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Admin moderation</h1>
          <p className="mt-2 text-gray-600">
            Pending memes: {memes?.length ?? 0}
          </p>
        </div>

        <a href="/" className="rounded-xl border px-4 py-2">
          Home
        </a>
      </div>

      <div className="mb-8 rounded-2xl border p-4">
        <div className="mb-3 text-xl font-semibold">Recent admin actions</div>

        {!recentActions || recentActions.length === 0 ? (
          <div className="text-gray-600">No actions yet.</div>
        ) : (
          <div className="space-y-2">
            {recentActions.map((item) => (
              <div key={item.id} className="text-sm text-gray-700">
                {item.action.toUpperCase()} · meme {item.target_meme_id ?? 'unknown'} ·{' '}
                {new Date(item.created_at).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400 p-4 text-red-600">
          Failed to load memes: {error.message}
        </div>
      )}

      {!error && (!memes || memes.length === 0) && (
        <div className="rounded-2xl border p-6 text-xl">
          No pending memes.
        </div>
      )}

      <div className="space-y-6">
        {memes?.map((meme) => (
          <div key={meme.id} className="rounded-2xl border p-4">
            <div className="mb-4 space-y-1">
              <div className="text-2xl font-semibold">
                {meme.title || 'Untitled meme'}
              </div>
              <div className="text-gray-700">
                {meme.caption || 'No caption'}
              </div>
              <div className="text-sm text-gray-500">
                Status: {meme.status} · Created: {new Date(meme.created_at).toLocaleString()}
              </div>
            </div>

            {meme.image_url && (
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meme.image_url}
                  alt={meme.title || 'Meme image'}
                  className="max-h-[500px] rounded-xl border"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <form action={approveMeme}>
                <input type="hidden" name="memeId" value={meme.id} />
                <button className="rounded-xl border px-4 py-2">
                  Approve
                </button>
              </form>

              <form action={rejectMeme}>
                <input type="hidden" name="memeId" value={meme.id} />
                <button className="rounded-xl border px-4 py-2">
                  Reject
                </button>
              </form>

              <form action={deleteMeme}>
                <input type="hidden" name="memeId" value={meme.id} />
                <button className="rounded-xl border px-4 py-2">
                  Delete permanently
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}