import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'

type Mode = 'signin' | 'signup'

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const defaultMode: Mode = (location.state as any)?.mode === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState<Mode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate('/dashboard', { replace: true })
      }
    }

    setSubmitting(false)
  }

  const inputCls = 'w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top stripe */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-red-600" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
        <div className="flex-1 bg-blue-700" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/soccer-ball.png" alt="" className="w-10 h-10 mb-3 mx-auto" />
          <div className="font-black text-2xl tracking-tight">
            PICK<span className="text-yellow-400">'EM</span>{" "}
            <span className="text-yellow-400">26</span>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Mode toggle */}
          <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
            {(['signin', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className={'flex-1 py-2.5 text-xs font-black rounded-lg transition uppercase tracking-widest ' + (
                  mode === m ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputCls}
              />
            </div>

            {error && (
              <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-400 text-black font-black text-xs py-4 rounded-xl uppercase tracking-widest hover:bg-yellow-300 transition disabled:opacity-50 mt-1"
            >
              {submitting ? '...'  : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link to="/" className="text-gray-600 text-xs uppercase tracking-widest hover:text-gray-400 transition">
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom stripe */}
      <div className="flex h-1.5">
        <div className="flex-1 bg-blue-700" />
        <div className="flex-1 bg-green-600" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-red-600" />
      </div>
    </div>
  )
}
