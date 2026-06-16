import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from './AuthContext'

export interface Group {
  id: string
  name: string
  invite_code: string
  created_by: string
}

interface GroupContextType {
  groups: Group[]
  activeGroup: Group | null
  setActiveGroup: (g: Group | null) => void
  loading: boolean
  refresh: () => Promise<void>
}

const GroupContext = createContext<GroupContextType>({
  groups: [],
  activeGroup: null,
  setActiveGroup: () => {},
  loading: true,
  refresh: async () => {},
})

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([])
      setActiveGroup(null)
      setLoading(false)
      return
    }

    setLoading(true)

    // Step 1: get group IDs this user belongs to
    console.log('[Groups] fetching for user:', user.id)
    const { data: memberRows, error: memberErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
    console.log('[Groups] memberRows:', memberRows, 'error:', memberErr)

    if (memberErr || !memberRows || memberRows.length === 0) {
      setGroups([])
      setActiveGroup(null)
      setLoading(false)
      return
    }

    const groupIds = memberRows.map(r => r.group_id)

    // Step 2: fetch the actual group records
    const { data: groupRows } = await supabase
      .from('groups')
      .select('id, name, invite_code, created_by')
      .in('id', groupIds)

    const fetched: Group[] = groupRows ?? []
    setGroups(fetched)

    // Keep activeGroup in sync or default to first
    setActiveGroup(prev => {
      if (prev) {
        const still = fetched.find(g => g.id === prev.id)
        return still ?? fetched[0] ?? null
      }
      return fetched[0] ?? null
    })

    setLoading(false)
  }, [user])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  return (
    <GroupContext.Provider value={{ groups, activeGroup, setActiveGroup, loading, refresh: fetchGroups }}>
      {children}
    </GroupContext.Provider>
  )
}
// eslint-disable-next-line react-refresh/only-export-components
export function useGroups() {
  return useContext(GroupContext)
}
