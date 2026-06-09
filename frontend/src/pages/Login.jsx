import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      // Navigation handled by App.jsx route guard
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(79,142,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.svg" alt="LeadUp" className="rounded-2xl object-cover shadow-lg" style={{ width: '56px', height: '56px' }} />
            <div className="text-left">
              <p className="text-xl font-bold text-white leading-none">LeadUp</p>
              <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">B2B Prospecting CRM</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Prospección B2B para el equipo comercial</p>
        </div>

        {/* Form card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-dark"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full mt-6 py-2.5 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          LeadUp v1.0
        </p>
      </div>
    </main>
  )
}
