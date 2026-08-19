import { createFileRoute, redirect } from "@tanstack/react-router"

import { currentUserQueryOptions } from "@/lib/auth"
import { handleProtectedRouteError } from "@/lib/route-guards"

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    )

    if (result.error) {
      handleProtectedRouteError(result.error)
    }

    throw redirect({ to: "/home", replace: true })
  },
})
