'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { dictionaries, type AppLanguage, type AppTheme } from '@/lib/i18n/dictionaries'

export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()

  const [lang, setLang] = useState<AppLanguage>('en')
  const [theme, setTheme] = useState<AppTheme>('system')
  const t = dictionaries[lang]

  async function handleContinue() {
    document.cookie = `mb_lang=${lang}; path=/; max-age=31536000; samesite=lax`
    document.cookie = `mb_theme=${theme}; path=/; max-age=31536000; samesite=lax`

    const root = document.documentElement
    root.classList.remove('light', 'dark')

    let appliedTheme = theme
    if (theme === 'system') {
      appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    root.classList.add(appliedTheme)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.rpc('set_my_language', { p_lang: lang })
      await supabase.rpc('set_my_theme', { p_theme: theme })
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">{t.chooseLanguage}</h1>

      <div className="space-y-4">
        <button
          onClick={() => setLang('en')}
          className={`w-full rounded-xl border p-3 ${lang === 'en' ? 'border-black font-semibold dark:border-white' : ''}`}
        >
          {dictionaries.en.english}
        </button>

        <button
          onClick={() => setLang('ru')}
          className={`w-full rounded-xl border p-3 ${lang === 'ru' ? 'border-black font-semibold dark:border-white' : ''}`}
        >
          {dictionaries.ru.russian}
        </button>

        <button
          onClick={() => setLang('es')}
          className={`w-full rounded-xl border p-3 ${lang === 'es' ? 'border-black font-semibold dark:border-white' : ''}`}
        >
          {dictionaries.es.spanish}
        </button>

        <div className="pt-4 text-lg font-medium">{t.theme}</div>

        <button
          onClick={() => setTheme('light')}
          className={`w-full rounded-xl border p-3 ${theme === 'light' ? 'border-black font-semibold dark:border-white' : ''}`}
        >
          {t.light}
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`w-full rounded-xl border p-3 ${theme === 'dark' ? 'border-black font-semibold dark:border-white' : ''}`}
        >
          {t.dark}
        </button>

        <button
          onClick={() => setTheme('system')}
          className={`w-full rounded-xl border p-3 ${theme === 'system' ? 'border-black font-semibold dark:border-white' : ''}`}
        >
          {t.system}
        </button>

        <button
          onClick={handleContinue}
          className="w-full rounded-xl border p-3"
        >
          Continue
        </button>
      </div>
    </main>
  )
}