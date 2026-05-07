import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UpdateFormWrapper from './UpdateFormWrapper'

export default async function UpdatePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.shelter_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-bold mb-2">Account not set up</h1>
          <p className="text-gray-400 text-sm">
            Your account hasn&apos;t been linked to a shelter yet. Contact the admin to get set up.
          </p>
        </div>
      </div>
    )
  }

  const { data: shelter } = await supabase
    .from('shelter_latest')
    .select('*')
    .eq('id', profile.shelter_id)
    .single()

  const { data: recentUpdates } = await supabase
    .from('bed_counts')
    .select('*')
    .eq('shelter_id', profile.shelter_id)
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen py-6">
      <UpdateFormWrapper
        shelter={shelter}
        userId={user.id}
        recentUpdates={recentUpdates ?? []}
      />
    </div>
  )
}
