'use client'
import { useRouter } from 'next/navigation'
import UpdateForm from '@/components/UpdateForm'
import type { Shelter, BedCount } from '@/lib/types'

type Props = {
  shelter: Shelter
  userId: string
  recentUpdates: BedCount[]
}

export default function UpdateFormWrapper({ shelter, userId, recentUpdates }: Props) {
  const router = useRouter()
  return (
    <UpdateForm
      shelter={shelter}
      userId={userId}
      recentUpdates={recentUpdates}
      onUpdate={() => router.refresh()}
    />
  )
}
