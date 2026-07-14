import { CreditCard } from "lucide-react";

import PaymentTab from "@/components/dashboard/whatsapp/orders-and-payments/components/PaymentTab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

import { useCommerce } from "../CommerceContext";
import { CommerceShell } from "../CommerceShell";

export function PaymentsPage() {
  const { catalogId, isCatalogConnected, isShopifyConnected, currentSetting } = useCommerce();

  return (
    <CommerceShell
      title="Payments"
      description="Configure how customers pay for orders placed through WhatsApp."
    >
      {!currentSetting ? (
        <Card className="px-6 py-16 text-center text-sm text-muted-foreground">
          WhatsApp settings not found. Please set up a WhatsApp account first.
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {!isCatalogConnected && (
            <Alert>
              <CreditCard />
              <AlertTitle>No catalog connected</AlertTitle>
              <AlertDescription>
                No WhatsApp catalog is connected to this store. Connect one in the Catalogs section
                to configure payments.
              </AlertDescription>
            </Alert>
          )}

          <PaymentTab catalogId={catalogId} isShopifyConnected={isShopifyConnected} />
        </div>
      )}
    </CommerceShell>
  );
}
