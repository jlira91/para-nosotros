import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { NotificationSetup } from '@/components/notification-setup'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Create couple server-side if missing (handles new registrations)
  if (profile && !profile.couple_id) {
    const inviteCode = user.user_metadata?.invite_code as string | null

    if (inviteCode) {
      const { data: invite } = await supabase
        .from('couple_invites')
        .select('*')
        .eq('code', inviteCode)
        .is('used_by', null)
        .single()

      if (invite && new Date(invite.expires_at) > new Date()) {
        const { data: couple } = await supabase
          .from('couples')
          .insert({ user1_id: invite.inviter_id, user2_id: user.id })
          .select()
          .single()

        if (couple) {
          await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', invite.inviter_id)
          await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', user.id)
          await supabase.from('couple_invites').update({ used_by: user.id, used_at: new Date().toISOString() }).eq('id', invite.id)
          profile = { ...profile, couple_id: couple.id }
        }
      }
    }

    if (!profile.couple_id) {
      const { data: couple } = await supabase
        .from('couples')
        .insert({ user1_id: user.id })
        .select()
        .single()

      if (couple) {
        await supabase.from('profiles').update({ couple_id: couple.id }).eq('id', user.id)
        profile = { ...profile, couple_id: couple.id }
      }
    }
  }

  let partnerProfile = null
  let invite = null

  if (profile?.couple_id) {
    // Get partner profile
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', profile.couple_id)
      .single()

    if (couple) {
      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      if (partnerId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', partnerId).single()
        partnerProfile = data
      }
    }

    // Get or create invite code
    const { data: existingInvite } = await supabase
      .from('couple_invites')
      .select('*')
      .eq('inviter_id', user.id)
      .is('used_by', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingInvite) {
      invite = existingInvite
    } else if (!partnerProfile) {
      // Create new invite
      const { data: newInvite } = await supabase
        .from('couple_invites')
        .insert({ inviter_id: user.id })
        .select()
        .single()
      invite = newInvite
    }
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <PullToRefresh />
      <NotificationSetup userId={user.id} />
      <Sidebar profile={profile} partnerProfile={partnerProfile} invite={invite} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
