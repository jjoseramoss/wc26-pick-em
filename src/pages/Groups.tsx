import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroups } from '../context/GroupContext'

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function Groups() {
  const { user } = useAuth()
  const { groups, refresh } = useGroups()
  const navigate = useNavigate()
  const [redirecting, setRedirecting] = useState(false)

  // Navigate once context actually reflects the new group
  useEffect(() => {
    if (redirecting && groups.length > 0) {
      navigate('/dashboard')
    }
  }, [redirecting, groups, navigate])

  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [groupName, setGroupName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')

    const code = randomCode()

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), invite_code: code, created_by: user.id })
      .select()
      .single()

    if (groupErr || !group) {
      setError(groupErr?.message ?? 'Failed to create group')
      setLoading(false)
      return
    }

    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: displayName.trim() || user.email!.split('@')[0] })

    if (memberErr) {
      setError(memberErr.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setRedirecting(true)
    refresh()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')

    const code = inviteCode.trim().toUpperCase()

    const { data: group, error: findErr } = await supabase
      .from('groups')
      .select()
      .eq('invite_code', code)
      .single()

    if (findErr || !group) {
      setError('Group not found. Check the invite code.')
      setLoading(false)
      return
    }

    // Check already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select()
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      setError('You\'re already in this group.')
      setLoading(false)
      return
    }

    const { error: joinErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, display_name: displayName.trim() || user.email!.split('@')[0] })

    if (joinErr) {
      setError(joinErr.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setRedirecting(true)
    refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-green-200 hover:text-white text-sm">← Back</button>
          <span className="font-bold">Groups</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Existing groups */}
        {groups.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Your Groups</h2>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-gray-900">{g.name}</span>
                  <span className="font-mono text-green-600 font-bold text-sm">{g.invite_code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-gray-200 p-1 mb-5">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'create' ? 'Create Group' : 'Join Group'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Group name</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Ramos Family"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Jose"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-60">
              {loading ? 'Creating…' : 'Create Group'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Invite code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="ABC123"
                maxLength={6}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Your display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Jose"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-60">
              {loading ? 'Joining…' : 'Join Group'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
