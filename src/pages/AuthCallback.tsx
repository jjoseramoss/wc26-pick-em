import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase automatically exchanges the token from the URL hash.
    // We just wait for the session to be established then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true })
      } else if (event === 'TOKEN_REFRESHED') {
        navigate('/dashboard', { replace: true })
      }
    })

    // Fallback: if session already exists (page reloaded), go to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f4f3ef'}}>
      <div className="text-center">
        <p className="eyebrow">Signing you in…</p>
      </div>
    </div>
  )
}
