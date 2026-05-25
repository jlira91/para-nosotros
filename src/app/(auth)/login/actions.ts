'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const EMAILS = {
  Jorge: 'jorge@paranosotros.app',
  Alessia: 'alessia@paranosotros.app',
} as const

export async function loginAction(formData: FormData) {
  const name = formData.get('name') as keyof typeof EMAILS
  const password = formData.get('password') as string

  if (!name || !EMAILS[name]) {
    return { error: 'Selecciona un usuario.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: EMAILS[name],
    password,
  })

  if (error) {
    return { error: 'Contraseña incorrecta.' }
  }

  redirect('/dashboard')
}
