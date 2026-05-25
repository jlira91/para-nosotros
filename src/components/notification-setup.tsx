'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X } from 'lucide-react'

const VAPID_PUBLIC = 'BCl_gppZseOgjbd0Cv1tbfzWH6a9HzPQIq027XUGSkwH4fF1_k02W0LxpE46vHn_hH2h8zQRrmCqG-AKzbs7th0'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function saveSubscription(subscription: PushSubscription, userId: string) {
  const supabase = createClient()
  const { endpoint, keys } = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'user_id,endpoint' }
  )
}

async function subscribe(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  })
  await saveSubscription(sub, userId)
}

export function NotificationSetup({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    // Register service worker
    navigator.serviceWorker.register('/sw.js').catch(() => {})

    const perm = Notification.permission
    setPermission(perm)

    if (perm === 'granted') {
      subscribe(userId).catch(() => {})
    }
  }, [userId])

  async function enable() {
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      await subscribe(userId)
    }
  }

  if (!permission || permission === 'denied' || permission === 'granted' || dismissed) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl shadow-lg px-4 py-3 max-w-sm w-[calc(100%-2rem)]">
      <Bell size={18} className="text-[var(--primary)] flex-shrink-0" />
      <p className="text-sm text-[var(--foreground)] flex-1">
        Activa las notificaciones para saber cuando tu pareja añade algo
      </p>
      <button
        onClick={enable}
        className="text-sm font-semibold text-[var(--primary)] hover:underline flex-shrink-0"
      >
        Activar
      </button>
      <button onClick={() => setDismissed(true)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}
