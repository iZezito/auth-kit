import { createFileRoute } from "@tanstack/react-router"

import ResetPassword from "@/pages/reset-password"
import { tokenSearchSchema } from "@/types"

export const Route = createFileRoute("/_guest/reset-password")({
  validateSearch: tokenSearchSchema,
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { token } = Route.useSearch()
  return <ResetPassword token={token} />
}
