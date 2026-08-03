import {
  IconBolt,
  IconBuilding,
  IconBuildingStore,
  IconChartBar,
  IconCommand,
  IconCreditCard,
  IconDatabase,
  IconHome,
  IconQrcode,
  IconRefresh,
  IconShoppingCart,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import type { IUserInfoApiResponse } from "@/backend/user/user.api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";

import { NavProjects } from "./nav-projects.tsx";
import { NavUser } from "./nav-user.tsx";

const data = {
  user: {
    name: "rateup",
    email: "rateup@gmail.com",
    avatar: "/avatars/rateup.jpg",
  },
  navMain: [
    {
      name: "User Stats",
      url: "/admin/userstats",
      icon: IconChartBar,
    },
    {
      name: "Orgs",
      url: "/admin/orgs",
      icon: IconBuilding,
    },
    {
      name: "Subscriptions",
      url: "/admin/subscriptions",
      icon: IconCreditCard,
    },
    {
      name: "RazorPay",
      url: "/admin/razorpay",
      icon: IconBolt,
    },
    {
      name: "Stripe",
      url: "/admin/stripe",
      icon: IconCreditCard,
    },
    {
      name: "Orders",
      url: "/admin/orders",
      icon: IconShoppingCart,
    },
    {
      name: "Share QR",
      url: "/admin/share-qr",
      icon: IconQrcode,
    },
    {
      name: "RateUp Plans",
      url: "/admin/rateup",
      icon: IconStar,
    },
    {
      name: "Generate data",
      url: "/admin/generate",
      icon: IconDatabase,
    },
    {
      name: "Update Center",
      url: "/admin/updateCenter",
      icon: IconRefresh,
    },
    {
      name: "Shopify Stores",
      url: "/admin/shopify",
      icon: IconBuildingStore,
    },
    {
      name: "Referrals",
      url: "/admin/referrals",
      icon: IconUsers,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  data?: IUserInfoApiResponse;
}

export function AppSidebar({ data: propData, ...props }: Readonly<AppSidebarProps>) {
  return (
    <Sidebar collapsible={"icon"} {...props} className="text-white">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#" />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <IconCommand className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Rateup</span>
                <span className="truncate text-xs">Enterprise</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              variant="outline"
              render={<Link to="/dashboard" className="text-foreground justify-between" />}
            >
              <div className="group-data-[collapsible=icon]:hidden">Go to Dashboard</div>
              <IconHome />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={propData?.data} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
