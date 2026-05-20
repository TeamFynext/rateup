"use client";

import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Package, Receipt } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import RazorpayPlans from "../../../components/admin/razorpay/plans.tsx";
import RazorpaySubscriptions from "../../../components/admin/razorpay/subscriptions.tsx";

export const Route = createFileRoute("/admin/razorpay/")({
  component: Index,
});

function Index() {
  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Razorpay Dashboard
          </h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage your Razorpay plans and subscriptions from a unified dashboard
      </p>
      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">
            <Package className="h-4 w-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Receipt className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <RazorpayPlans />
        </TabsContent>
        <TabsContent value="subscriptions">
          <RazorpaySubscriptions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
