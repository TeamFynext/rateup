"use client";

import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Package, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";

import StripeProducts from "../../../components/admin/stripe/StripeProducts.tsx";
import StripeSubscription from "../../../components/admin/stripe/StripeSubscription.tsx";

export const Route = createFileRoute("/admin/stripe/")({
  component: Index,
});

function Index() {
  const { t: translations } = useTranslation();

  return (
    <div className="container mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Stripe Dashboard
          </h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage your Stripe products and subscriptions from a unified dashboard
      </p>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">
            <Package className="h-4 w-4" />
            {translations("Products")}
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Receipt className="h-4 w-4" />
            {translations("Subscriptions")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <StripeProducts />
        </TabsContent>

        <TabsContent value="subscriptions">
          <StripeSubscription />
        </TabsContent>
      </Tabs>
    </div>
  );
}
