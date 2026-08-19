import { Link } from "@tanstack/react-router"
import { Home, ShieldCheck } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/api"

export function NavMain({ role }: { role: CurrentUser["role"] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navegação</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton render={<Link to="/home" />} tooltip="Início">
            <Home />
            <span>Início</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {role === "ADMIN" ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link to="/admin" />}
              tooltip="Administração"
            >
              <ShieldCheck />
              <span>Administração</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  )
}
