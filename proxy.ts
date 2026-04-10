import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/beta',
  '/welcome',
]

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true
  }

  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/file.svg' ||
    pathname === '/globe.svg' ||
    pathname === '/next.svg' ||
    pathname === '/vercel.svg' ||
    pathname === '/window.svg'
  ) {
    return true
  }

  return false
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const langCookie = request.cookies.get('mb_lang')?.value
  const publicPath = isPublicPath(pathname)

  const publicSystemPath =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/favicon.ico'

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (!publicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/beta'
      return NextResponse.redirect(url)
    }

    return response
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('beta_access, role')
    .eq('id', user.id)
    .single()

  const allowed = !!profile?.beta_access || profile?.role === 'admin'

  if (!allowed && pathname !== '/beta') {
    const url = request.nextUrl.clone()
    url.pathname = '/beta'
    return NextResponse.redirect(url)
  }

  if (allowed && pathname === '/beta') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (allowed && !langCookie && pathname !== '/welcome' && !publicSystemPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}