'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'auto' | 'light' | 'dark'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

type Props = {
  onTokenChange: (token: string | null) => void
  resetKey: number
}

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export default function TurnstileBox({ onTokenChange, resetKey }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const lastResetKeyRef = useRef<number>(resetKey)

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    function renderWidget() {
      if (
        cancelled ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current
      ) {
        return
      }

      const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

      if (!sitekey) {
        return
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey,
        theme: 'auto',
        callback: (token) => onTokenChange(token),
        'expired-callback': () => onTokenChange(null),
        'error-callback': () => onTokenChange(null),
      })
    }

    function ensureScript() {
      const existing = document.getElementById(SCRIPT_ID) as
        | HTMLScriptElement
        | null

      if (existing) {
        renderWidget()
        return
      }

      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = () => {
        renderWidget()
      }
      document.body.appendChild(script)
    }

    ensureScript()
    intervalId = setInterval(renderWidget, 250)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)

      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [onTokenChange])

  useEffect(() => {
    if (lastResetKeyRef.current === resetKey) return
    lastResetKeyRef.current = resetKey

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      onTokenChange(null)
    }
  }, [resetKey, onTokenChange])

  return <div ref={containerRef} className="overflow-hidden rounded-xl" />
}