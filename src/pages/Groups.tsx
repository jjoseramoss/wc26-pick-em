import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGroups } from '../context/GroupContext'
import { createGroup, joinGroup } from '../utils/groups'

export default function Groups() {
  const { user } = useAuth()
  const { groups, refresh, setActiveGroup } = useGroups()
  const navigate = useNavigate()

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

    try {
      const group = await createGroup(groupName, displayName || user.email?.split('@')[0] || 'Player')
      await refresh()
      setActiveGroup(group)
      navigate('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const group = await joinGroup(inviteCode, displayName || user.email?.split('@')[0] || 'Player')
      await refresh()
      setActiveGroup(group)
      navigate('/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join group')
    } finally {
      setLoading(false)
    }
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
