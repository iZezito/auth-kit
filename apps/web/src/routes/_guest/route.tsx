import { createFileRoute, Outlet } from "@tanstack/react-router"

import { getOptionalCurrentUser } from "@/lib/auth"
import { redirectAuthenticatedUser } from "@/lib/route-guards"

export const Route = createFileRoute("/_guest")({
  beforeLoad: async ({ context }) => {
    const user = await getOptionalCurrentUser(context.queryClient)

    redirectAuthenticatedUser(user)
  },
  component: Outlet,
})
