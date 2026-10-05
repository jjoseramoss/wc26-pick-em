import type { Group } from '../context/GroupContext'
import { supabase } from './supabase'

export async function createGroup(name: string, displayName: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_pickem_group', {
    p_name: name.trim(),
    p_display_name: displayName.trim(),
  })
  if (error) throw error
  if (!data) throw new Error('The group was not created. Please try again.')
  return data as Group
}

export async function joinGroup(inviteCode: string, displayName: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_pickem_group', {
    p_invite_code: inviteCode.trim().toUpperCase(),
    p_display_name: displayName.trim(),
  })
  if (error) throw error
  if (!data) throw new Error('The group was not found. Check the invite code.')
  return data as Group
}
