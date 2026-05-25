'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const USERS = ['Jorge', 'Alessia'] as const
type UserName = typeof USERS[number]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} size="lg" className="w-full">
      Entrar
    </Button>
  )
}

export default function LoginPage() {
  const [selected, setSelected] = useState<UserName | null>(null)
  const [error, setError] = useState('')

  async function handleAction(formData: FormData) {
    setError('')
    const result = await loginAction(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">¡Hola! ¿Quién eres?</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Elige tu nombre para entrar</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {USERS.map(name => (
          <button
            key={name}
            type="button"
            onClick={() => { setSelected(name); setError('') }}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
              selected === name
                ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                : 'border-[var(--border)] bg-white hover:border-[var(--primary)] hover:bg-[var(--primary-light)]'
            }`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${
              selected === name ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--foreground)]'
            }`}>
              {name[0]}
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">{name}</span>
          </button>
        ))}
      </div>

      {selected && (
        <form action={handleAction} className="flex flex-col gap-3">
          <input type="hidden" name="name" value={selected} />
          <Input
            label={`Contraseña de ${selected}`}
            type="password"
            name="password"
            placeholder="••••••••"
            autoFocus
            required
          />
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          <SubmitButton />
        </form>
      )}
    </div>
  )
}
