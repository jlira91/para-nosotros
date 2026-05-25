export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF6F0] via-[#FDFAF7] to-[#F5E8E9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--primary)] mb-4 shadow-lg">
            <span className="text-2xl">💑</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Para Nosotros</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Tu espacio compartido en pareja</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl border border-[var(--border)] p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
