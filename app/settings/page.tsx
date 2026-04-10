'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  dictionaries,
  isValidLanguage,
  isValidTheme,
  type AppLanguage,
  type AppTheme,
} from '@/lib/i18n/dictionaries'

type ProfileData = {
  username: string | null
  preferred_language: AppLanguage | null
  preferred_theme: AppTheme | null
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [lang, setLang] = useState<AppLanguage>('en')
  const [theme, setTheme] = useState<AppTheme>('system')
  const [email, setEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  const [newUsername, setNewUsername] = useState('')
  const [usernameMessage, setUsernameMessage] = useState('')
  const [usernameError, setUsernameError] = useState('')

  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackInfo, setFeedbackInfo] = useState('')
  const [feedbackError, setFeedbackError] = useState('')

  const [resetInfo, setResetInfo] = useState('')
  const [resetError, setResetError] = useState('')
  const [loadingLogout, setLoadingLogout] = useState(false)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  useEffect(() => {
    async function loadData() {
      const cookieLang = document.cookie
        .split('; ')
        .find((row) => row.startsWith('mb_lang='))
        ?.split('=')[1]

      const cookieTheme = document.cookie
        .split('; ')
        .find((row) => row.startsWith('mb_theme='))
        ?.split('=')[1]

      if (cookieLang && isValidLanguage(cookieLang)) {
        setLang(cookieLang)
      }

      if (cookieTheme && isValidTheme(cookieTheme)) {
        setTheme(cookieTheme)
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email ?? null)

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, preferred_language, preferred_theme')
          .eq('id', user.id)
          .single<ProfileData>()

        if (profile?.username) {
          setUsername(profile.username)
          setNewUsername(profile.username)
        }

        if (profile?.preferred_language) {
          setLang(profile.preferred_language)
        }

        if (profile?.preferred_theme) {
          setTheme(profile.preferred_theme)
        }
      }
    }

    loadData()
  }, [supabase])

  function applyThemeToDom(nextTheme: AppTheme) {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    let appliedTheme = nextTheme
    if (nextTheme === 'system') {
      appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }

    root.classList.add(appliedTheme)
  }

  async function applyLanguage(nextLang: AppLanguage) {
    setLang(nextLang)
    document.cookie = `mb_lang=${nextLang}; path=/; max-age=31536000; samesite=lax`

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.rpc('set_my_language', { p_lang: nextLang })
    }

    router.refresh()
  }

  async function applyTheme(nextTheme: AppTheme) {
    setTheme(nextTheme)
    document.cookie = `mb_theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`

    applyThemeToDom(nextTheme)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.rpc('set_my_theme', { p_theme: nextTheme })
    }
  }

  async function handleLogout() {
    setLoadingLogout(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleUsernameSave() {
    setUsernameError('')
    setUsernameMessage('')

    const trimmed = newUsername.trim().toLowerCase()

    const { data: available, error: availableError } = await supabase.rpc(
      'is_username_available',
      { p_username: trimmed }
    )

    if (availableError) {
      setUsernameError(availableError.message)
      return
    }

    if (!available && trimmed !== username?.toLowerCase()) {
      setUsernameError('Username is taken or invalid')
      return
    }

    const { error } = await supabase.rpc('set_my_username', {
      p_username: trimmed,
    })

    if (error) {
      setUsernameError(error.message)
      return
    }

    setUsername(trimmed)
    setUsernameMessage('Username updated')
  }

  async function handleSendResetEmail() {
    setResetError('')
    setResetInfo('')

    if (!email) {
      setResetError('No email found')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setResetError(error.message)
      return
    }

    setResetInfo('Password reset email sent')
  }

  async function handleSendIdea() {
    setFeedbackError('')
    setFeedbackInfo('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('feedback_ideas').insert({
      user_id: user?.id ?? null,
      email: email ?? null,
      title: feedbackTitle,
      message: feedbackMessage,
    })

    if (error) {
      setFeedbackError(error.message)
      return
    }

    setFeedbackTitle('')
    setFeedbackMessage('')
    setFeedbackInfo('Idea sent')
  }

  const t = dictionaries[lang]

  return (
    <main className="mx-auto max-w-md p-8">
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => router.push('/')}
          className="rounded-xl border px-4 py-2"
        >
          {t.home}
        </button>

        <button
          onClick={handleLogout}
          disabled={loadingLogout}
          className="rounded-xl border px-4 py-2"
        >
          {loadingLogout ? '...' : t.logout}
        </button>
      </div>

      <h1 className="mb-6 text-3xl font-bold">{t.settings}</h1>

      <div className="mb-8 space-y-4 rounded-2xl border p-4">
        <div className="text-lg font-semibold">{t.account}</div>
        <div>{t.email}: {email ?? '—'}</div>
        <div>{t.username}: {username ?? '—'}</div>

        <input
          className="w-full rounded-xl border p-3"
          placeholder={t.newUsername}
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />

        <button
          onClick={handleUsernameSave}
          className="w-full rounded-xl border p-3"
        >
          {t.saveUsername}
        </button>

        <button
          onClick={handleSendResetEmail}
          className="w-full rounded-xl border p-3"
        >
          {t.sendResetEmail}
        </button>

        {usernameError && <p className="text-red-600">{usernameError}</p>}
        {usernameMessage && <p className="text-green-600">{usernameMessage}</p>}
        {resetError && <p className="text-red-600">{resetError}</p>}
        {resetInfo && <p className="text-green-600">{resetInfo}</p>}
      </div>

      <div className="mb-8 space-y-4">
        <div className="text-lg">{t.language}</div>

        <button
          onClick={() => applyLanguage('en')}
          className={`w-full rounded-xl border p-3 ${
            lang === 'en' ? 'border-black font-semibold dark:border-white' : ''
          }`}
        >
          {dictionaries.en.english}
        </button>

        <button
          onClick={() => applyLanguage('ru')}
          className={`w-full rounded-xl border p-3 ${
            lang === 'ru' ? 'border-black font-semibold dark:border-white' : ''
          }`}
        >
          {dictionaries.ru.russian}
        </button>

        <button
          onClick={() => applyLanguage('es')}
          className={`w-full rounded-xl border p-3 ${
            lang === 'es' ? 'border-black font-semibold dark:border-white' : ''
          }`}
        >
          {dictionaries.es.spanish}
        </button>

        <div className="pt-4 text-lg">{t.theme}</div>

        <button
          onClick={() => applyTheme('light')}
          className={`w-full rounded-xl border p-3 ${
            theme === 'light' ? 'border-black font-semibold dark:border-white' : ''
          }`}
        >
          {t.light}
        </button>

        <button
          onClick={() => applyTheme('dark')}
          className={`w-full rounded-xl border p-3 ${
            theme === 'dark' ? 'border-black font-semibold dark:border-white' : ''
          }`}
        >
          {t.dark}
        </button>

        <button
          onClick={() => applyTheme('system')}
          className={`w-full rounded-xl border p-3 ${
            theme === 'system' ? 'border-black font-semibold dark:border-white' : ''
          }`}
        >
          {t.system}
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border p-4">
        <div className="text-lg font-semibold">{t.feedback}</div>

        <input
          className="w-full rounded-xl border p-3"
          placeholder={t.ideaTitle}
          value={feedbackTitle}
          onChange={(e) => setFeedbackTitle(e.target.value)}
        />

        <textarea
          className="min-h-32 w-full rounded-xl border p-3"
          placeholder={t.ideaMessage}
          value={feedbackMessage}
          onChange={(e) => setFeedbackMessage(e.target.value)}
        />

        <button
          onClick={handleSendIdea}
          className="w-full rounded-xl border p-3"
        >
          {t.sendIdea}
        </button>

        {feedbackError && <p className="text-red-600">{feedbackError}</p>}
        {feedbackInfo && <p className="text-green-600">{feedbackInfo}</p>}
      </div>
    </main>
  )
}