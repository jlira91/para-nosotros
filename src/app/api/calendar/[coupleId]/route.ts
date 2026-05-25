import { createBrowserClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://uzmyiuvwlmvasobqnxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bXlpdXZ3bG12YXNvYnFueGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA3MzksImV4cCI6MjA5NDI1NjczOX0.tjv-QvgQphr75Yo6n-tW1ZWojDpFib-b2kVqdKPfU9E'

function formatICSDate(date: string, allDay: boolean, addDay = false) {
  const d = new Date(date)
  if (addDay) d.setUTCDate(d.getUTCDate() + 1)
  if (allDay) {
    return d.toISOString().slice(0, 10).replace(/-/g, '')
  }
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
}

function escapeICS(str: string | null) {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ coupleId: string }> }
) {
  const { coupleId } = await params

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: events, error } = await supabase.rpc('get_public_calendar_events', {
    p_couple_id: coupleId,
  })

  if (error) {
    return new NextResponse('Error fetching events', { status: 500 })
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Para Nosotros//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Para Nosotros',
    'X-WR-CALDESC:Calendario compartido de pareja',
    'X-WR-TIMEZONE:America/Lima',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ]

  for (const event of events || []) {
    const dtstart = event.all_day
      ? `DTSTART;VALUE=DATE:${formatICSDate(event.start_date, true)}`
      : `DTSTART:${formatICSDate(event.start_date, false)}`

    const dtend = event.end_date
      ? event.all_day
        ? `DTEND;VALUE=DATE:${formatICSDate(event.end_date, true, true)}`
        : `DTEND:${formatICSDate(event.end_date, false)}`
      : event.all_day
        ? `DTEND;VALUE=DATE:${formatICSDate(event.start_date, true, true)}`
        : `DTEND:${formatICSDate(event.start_date, false)}`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@paranosotros.app`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`)
    lines.push(dtstart)
    lines.push(dtend)
    lines.push(`SUMMARY:${escapeICS(event.title)}`)
    if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
    if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="para-nosotros.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
