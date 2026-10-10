import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

export default function Account() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setName(typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : '')
    setEmail(user?.email ?? '')
  }, [user])

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    setSaving(true); setError(''); setMessage('')
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName) { setError('Enter a display name.'); setSaving(false); return }
    const nameChanged = trimmedName !== (user.user_metadata?.display_name ?? '')
    const emailChanged = trimmedEmail !== user.email
    try {
      if (nameChanged) {
        const { error } = await supabase.auth.updateUser({ data: { display_name: trimmedName } })
        if (error) throw error
      }
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (error) throw error
      }
      setMessage(emailChanged ? 'Profile saved. Check your email for the address change confirmation.' : 'Profile saved.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your account.')
    } finally { setSaving(false) }
  }

  async function handleSignOut() { await signOut(); navigate('/', { replace: true }) }

  return <AppShell>
    <div className="hero-band"><div><span className="eyebrow">YOUR ACCOUNT / SETTINGS</span><h1 className="page-title">Player profile<span className="accent">.</span></h1><p className="page-copy">Keep your account details up to date.</p></div></div>
    <div className="account-grid"><section className="panel account-panel"><h2>Account details</h2><p>Your profile name appears in the navigation. Names in existing group leaderboards are set separately when you join a group.</p><form onSubmit={saveProfile}>
      <div className="form-field"><label htmlFor="profileName">Profile name</label><input className="form-input" id="profileName" value={name} onChange={event=>setName(event.target.value)} maxLength={40} required /></div>
      <div className="form-field"><label htmlFor="profileEmail">Email address</label><input className="form-input" id="profileEmail" type="email" value={email} onChange={event=>setEmail(event.target.value)} required /><span className="form-help">Changing your email may require confirmation before it takes effect.</span></div>
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
      <button className="button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} ↗</button>
    </form></section><aside className="panel account-panel"><span className="eyebrow">SIGNED IN AS</span><h2 style={{marginTop:14}}>{user?.email}</h2><p>Want to switch accounts? Sign out here, then sign in with another email.</p><button className="button-dark" onClick={handleSignOut}>Sign out ↗</button></aside></div>
  </AppShell>
}
