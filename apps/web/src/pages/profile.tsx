import { PageLayout } from "@/components/page-layout"
import { ProfileForm } from "@/components/profile-form"
import type { CurrentUser } from "@/lib/api"

export default function Profile({ user }: { user: CurrentUser }) {
  return (
    <PageLayout breadcrumbs={[{ label: "Meus dados" }]}>
      <ProfileForm user={user} />
    </PageLayout>
  )
}
