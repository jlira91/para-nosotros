import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://uzmyiuvwlmvasobqnxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bXlpdXZ3bG12YXNvYnFueGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA3MzksImV4cCI6MjA5NDI1NjczOX0.tjv-QvgQphr75Yo6n-tW1ZWojDpFib-b2kVqdKPfU9E'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
