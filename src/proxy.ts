import { NextRequest, NextResponse } from 'next/server'

const authPaths = ['/login']
const publicPaths = ['/auth/callback', '/_next', '/favicon.ico', '/api/calendar', '/icon', '/apple-icon', '/manifest', '/sw.js']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check for Supabase session cookie (optimistic check)
  const cookieNames = request.cookies.getAll().map(c => c.name)
  const hasSession = cookieNames.some(
    name => name.startsWith('sb-') && name.endsWith('-auth-token')
  )

  const isAuthPath = authPaths.some(p => pathname.startsWith(p))

  if (!hasSession && !isAuthPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
