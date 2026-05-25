import webpush from 'web-push'
import { createBrowserClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://uzmyiuvwlmvasobqnxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bXlpdXZ3bG12YXNvYnFueGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA3MzksImV4cCI6MjA5NDI1NjczOX0.tjv-QvgQphr75Yo6n-tW1ZWojDpFib-b2kVqdKPfU9E'

const VAPID_PUBLIC = 'BCl_gppZseOgjbd0Cv1tbfzWH6a9HzPQIq027XUGSkwH4fF1_k02W0LxpE46vHn_hH2h8zQRrmCqG-AKzbs7th0'
const VAPID_PRIVATE = 'RWPZrrr6Bd-fQh_K543jrMn6HfEQ0eQ6t1y1LtKy38E'

webpush.setVapidDetails('mailto:hola@paranosotros.app', VAPID_PUBLIC, VAPID_PRIVATE)

export async function POST(req: NextRequest) {
  const { coupleId, senderId, title, body, url } = await req.json()
  if (!coupleId || !senderId || !title) return NextResponse.json({ ok: false }, { status: 400 })

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: subs } = await supabase.rpc('get_partner_subscription', {
    p_couple_id: coupleId,
    p_sender_id: senderId,
  })

  if (!subs || subs.length === 0) return NextResponse.json({ ok: false, reason: 'no_subscription' })

  const payload = JSON.stringify({ title, body, url: url || '/' })

  await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )

  return NextResponse.json({ ok: true })
}
