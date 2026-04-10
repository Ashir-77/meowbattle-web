'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  memeId: string
  initialLiked: boolean
  initialLikes: number
}

export default function MemeLikeButton({
  memeId,
  initialLiked,
  initialLikes,
}: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(initialLikes)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      if (liked) {
        const { error } = await supabase
          .from('meme_likes')
          .delete()
          .eq('meme_id', memeId)
          .eq('user_id', user.id)

        if (!error) {
          setLiked(false)
          setLikes((prev) => Math.max(prev - 1, 0))
          router.refresh()
        }
      } else {
        const { error } = await supabase.from('meme_likes').insert({
          meme_id: memeId,
          user_id: user.id,
        })

        if (!error) {
          setLiked(true)
          setLikes((prev) => prev + 1)
          router.refresh()
        }
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl border px-4 py-2"
    >
      {isPending ? '...' : liked ? `Unlike · ${likes}` : `Like · ${likes}`}
    </button>
  )
}