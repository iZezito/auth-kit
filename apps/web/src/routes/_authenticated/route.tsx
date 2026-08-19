import { createFileRoute, Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { currentUserQueryOptions } from "@/lib/auth"
import { handleProtectedRouteError } from "@/lib/route-guards"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const result = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    )

    if (result.error) {
      handleProtectedRouteError(result.error)
    }

    return { user: result.data }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
