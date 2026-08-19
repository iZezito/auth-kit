import { createFileRoute } from "@tanstack/react-router"

import ValidateEmail from "@/pages/validate-email"
import { tokenSearchSchema } from "@/types"

export const Route = createFileRoute("/_guest/validate-email")({
  validateSearch: tokenSearchSchema,
  component: ValidateEmailRoute,
})

function ValidateEmailRoute() {
  const { token } = Route.useSearch()
  return <ValidateEmail token={token} />
}
