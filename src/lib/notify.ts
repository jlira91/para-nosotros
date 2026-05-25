export async function notifyPartner(
  coupleId: string,
  senderId: string,
  title: string,
  body: string,
  url?: string
) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coupleId, senderId, title, body, url }),
    })
  } catch {
    // Notifications are best-effort
  }
}
