"use client";

import { CreditCard, Package, Receipt } from "lucide-react";
import { useExtracted } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import StripeProducts from "./StripeProducts";
import StripeSubscription from "./StripeSubscription";

const index = () => {
  const translations = useExtracted();

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
};

export default index;
