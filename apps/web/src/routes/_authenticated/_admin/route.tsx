import { createFileRoute, Outlet } from "@tanstack/react-router"

import { requireRole } from "@/lib/route-guards"

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: ({ context }) => {
    requireRole(context.user, ["ADMIN"])
  },
  component: Outlet,
})
