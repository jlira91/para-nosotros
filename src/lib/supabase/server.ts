import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    'https://uzmyiuvwlmvasobqnxgx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bXlpdXZ3bG12YXNvYnFueGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA3MzksImV4cCI6MjA5NDI1NjczOX0.tjv-QvgQphr75Yo6n-tW1ZWojDpFib-b2kVqdKPfU9E',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
