import { createFileRoute } from "@tanstack/react-router"

import Profile from "@/pages/profile"
import { requireRole } from "@/lib/route-guards"

export const Route = createFileRoute("/_authenticated/profile")({
  beforeLoad: ({ context }) => {
    requireRole(context.user, ["DEFAULT"])
  },
  component: ProfileRoute,
})

function ProfileRoute() {
  const { user } = Route.useRouteContext()
  return <Profile user={user} />
}
