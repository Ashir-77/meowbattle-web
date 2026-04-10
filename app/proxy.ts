import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const langCookie = request.cookies.get('mb_lang')?.value

  const publicSystemPaths =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/favicon.ico'

  if (!langCookie && pathname !== '/welcome' && !publicSystemPaths) {
    const url = request.nextUrl.clone()
    url.pathname = '/welcome'
    return Response.redirect(url)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}