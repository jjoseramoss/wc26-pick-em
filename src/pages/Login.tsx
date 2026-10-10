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
  const [info, setInfo] = useState('')

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setInfo('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        navigate('/dashboard', { replace: true })
      } else {
        setInfo('Check your email for a confirmation link, then sign in.')
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

  return <div className="auth-page">
    <aside className="auth-art"><Link to="/" className="landing-logo" style={{color:'#fff'}}>PICKEM<span className="brand-period">.</span></Link><h1>YOUR<br/>GAME.<br/><span className="accent">YOUR</span><br/>CALL.</h1><p>Predict the score. Compete with your people.</p></aside>
    <div className="auth-form-wrap"><div className="auth-form">
      <span className="eyebrow">WELCOME TO PICKEM / 001</span>
      <h2>{mode === 'signin' ? 'Back for more?' : 'Join the game.'}</h2>
      <p className="page-copy">{mode === 'signin' ? 'Sign in to see your groups and make your next pick.' : 'Create an account and start a group with friends.'}</p>
      <div className="auth-mode" role="tablist" aria-label="Account action">{(['signin','signup'] as Mode[]).map(m => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => {setMode(m);setError('');setInfo('')}}>{m === 'signin' ? 'Sign in' : 'Create account'}</button>)}</div>
      <form onSubmit={handleSubmit}>
        <div className="form-field"><label htmlFor="email">Email address</label><input id="email" className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus /></div>
        <div className="form-field"><label htmlFor="password">Password</label><input id="password" className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required /></div>
        {error && <p className="form-error" role="alert">{error}</p>}{info && <p className="form-success" role="status">{info}</p>}
        <button className="button-primary" type="submit" disabled={submitting} style={{width:'100%'}}>{submitting ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'} <span>↗</span></button>
      </form>
      <p className="form-help" style={{marginTop:25}}>New season, new predictions. Your picks stay with your group.</p>
    </div></div>
  </div>
}
