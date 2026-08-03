import type { TablerIcon } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar.tsx";

export function NavProjects({
  projects,
}: Readonly<{
  projects: {
    name: string;
    url: string;
    icon: TablerIcon;
  }[];
}>) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  return (
    <SidebarGroup>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton isActive={pathname === item.url} render={<Link to={item.url} />}>
              <item.icon />
              <span>{item.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
