import AcceptInviteForm from '@/components/auth/accept-invite-form'
import { Suspense } from 'react'

export const metadata = {
  title: 'Accept Invitation | DocuRoute',
  description: 'Accept your invitation to join a company on DocuRoute',
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInviteForm />
    </Suspense>
  )
}
