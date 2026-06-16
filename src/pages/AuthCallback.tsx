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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <img src="/soccer-ball.png" alt="" className="w-12 h-12 mb-4 animate-bounce" />
        <p className="text-gray-600 font-medium">Signing you in…</p>
      </div>
    </div>
  )
}
