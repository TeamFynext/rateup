"use client";

import * as React from "react";

import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  Command,
  CreditCard,
  Database,
  QrCode,
  RefreshCw,
  ShoppingCart,
  Star,
  Store,
  Zap,
} from "lucide-react";

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
      icon: BarChart3,
    },
    {
      name: "Orgs",
      url: "/admin/orgs",
      icon: Building2,
    },
    {
      name: "Subscriptions",
      url: "/admin/subscriptions",
      icon: CreditCard,
    },
    {
      name: "RazorPay",
      url: "/admin/razorpay",
      icon: Zap,
    },
    {
      name: "Stripe",
      url: "/admin/stripe",
      icon: CreditCard,
    },
    {
      name: "Orders",
      url: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      name: "Share QR",
      url: "/admin/share-qr",
      icon: QrCode,
    },
    {
      name: "RateUp Plans",
      url: "/admin/rateup",
      icon: Star,
    },
    {
      name: "Generate data",
      url: "/admin/generate",
      icon: Database,
    },
    {
      name: "Update Center",
      url: "/admin/updateCenter",
      icon: RefreshCw,
    },
    {
      name: "Shopify Stores",
      url: "/admin/shopify",
      icon: Store,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  data?: any;
}

export function AppSidebar({
  data: propData,
  ...props
}: Readonly<AppSidebarProps>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Rateup</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
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
            <SidebarMenuButton asChild variant="outline">
              <Link to="/dashboard">Go to Dashboard</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={propData?.data} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
