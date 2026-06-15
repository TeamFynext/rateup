"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CreditCard,
  Database,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

export const Route = createFileRoute("/admin/")({
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();

  function NavigationCard({
    title,
    description,
    icon: Icon,
    onClick,
    gradient,
  }: {
    title: string;
    description: string;
    icon: any;
    onClick: () => void;
    gradient: string;
  }) {
    return (
      <Card
        className="relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group"
        onClick={onClick}
      >
        <div className={`absolute inset-0 ${gradient}`} />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/50 dark:bg-gray-900/20 rounded-lg group-hover:bg-white/70 dark:group-hover:bg-gray-900/30 transition-colors">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {translations("Admin Dashboard")}
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your platform settings, users, and integrations from a
          centralized dashboard
        </p>
      </div>
      {/* Organization & User Management */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Users className="h-5 w-5" />
          Organization & User Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NavigationCard
            title="Organizations"
            description="Manage all organizations and their settings"
            icon={Building2}
            onClick={() =>
              navigate({
                to: "/admin/orgs",
              })
            }
            gradient="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
          />

          <NavigationCard
            title="User Statistics"
            description="View user analytics and manage user accounts"
            icon={BarChart3}
            onClick={() =>
              navigate({
                to: "/admin/userstats",
              })
            }
            gradient="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
          />

          <NavigationCard
            title={translations("Manage User Access")}
            description="Control user subscriptions and access levels"
            icon={Users}
            onClick={() =>
              navigate({
                to: "/admin/subscriptions",
              })
            }
            gradient="bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20"
          />

          <NavigationCard
            title="Referrals"
            description="Create influencer referral tracking codes and links"
            icon={Users}
            onClick={() =>
              navigate({
                to: "/admin/referrals",
              })
            }
            gradient="bg-linear-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20"
          />
        </div>
      </div>
      {/* Payment & Billing */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment & Billing Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <NavigationCard
            title={translations("Manage Razorpay Plans")}
            description="Configure Razorpay payment plans and subscriptions"
            icon={CreditCard}
            onClick={() =>
              navigate({
                to: "/admin/razorpay",
              })
            }
            gradient="bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20"
          />

          <NavigationCard
            title="Stripe Dashboard"
            description="Manage Stripe products and subscriptions"
            icon={CreditCard}
            onClick={() =>
              navigate({
                to: "/admin/stripe",
              })
            }
            gradient="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20"
          />

          <NavigationCard
            title="Orders"
            description="View and manage all payment orders"
            icon={ShoppingCart}
            onClick={() =>
              navigate({
                to: "/admin/orders",
              })
            }
            gradient="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
          />

          <NavigationCard
            title="RateUp Plans"
            description="Configure internal RateUp subscription plans"
            icon={Zap}
            onClick={() =>
              navigate({
                to: "/admin/rateup",
              })
            }
            gradient="bg-linear-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20"
          />
        </div>
      </div>
      {/* System Management */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Management
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NavigationCard
            title="Update Center"
            description="Manage system updates and data migrations"
            icon={Database}
            onClick={() =>
              navigate({
                to: "/admin/updateCenter",
              })
            }
            gradient="bg-linear-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20"
          />

          <NavigationCard
            title="Generate Test Data"
            description="Create test data for development purposes"
            icon={Database}
            onClick={() =>
              navigate({
                to: "/admin/generate",
              })
            }
            gradient="bg-linear-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20"
          />

          <NavigationCard
            title="Shopify Integration"
            description="Manage Shopify store integrations"
            icon={ShoppingBag}
            onClick={() =>
              navigate({
                to: "/admin/shopify",
              })
            }
            gradient="bg-linear-to-br from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20"
          />
        </div>
      </div>
      {/* Quick Stats */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              Quick Access
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Welcome to the admin dashboard. Use the cards above to navigate to
            different management sections. Each section provides comprehensive
            tools for managing your platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
