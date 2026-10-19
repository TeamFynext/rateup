import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useShopStore } from "@/backend/commerce/shop.query";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { CheckoutTab } from "../settings/CheckoutTab.tsx";
import { DeliveryTab } from "../settings/DeliveryTab.tsx";
import { LegacyTab } from "../settings/LegacyTab.tsx";
import { MessagesTab } from "../settings/MessagesTab.tsx";
import { PaymentsTab } from "../settings/PaymentsTab.tsx";
import { StoreTab } from "../settings/StoreTab.tsx";
import { SETTINGS_TABS, SHOP_PATHS, settingsTabLabel, type SettingsTab } from "../shop/shopMeta.ts";
import { ShopPage } from "../shop/ShopUi.tsx";
import { useLegacyCatalog } from "../shop/useLegacyCatalog.ts";

export function SettingsPage({ tab }: Readonly<{ tab: SettingsTab | undefined }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: store, isPending, isError, error } = useShopStore();
  const { hasLegacy } = useLegacyCatalog();
  const tabs = SETTINGS_TABS.filter((id) => id !== "legacy" || hasLegacy);
  // A shop paid on its store's checkout has nothing to set up under Getting paid.
  const fallback: SettingsTab = store && store.checkoutVia !== "RATEUP" ? "checkout" : "payments";
  const active: SettingsTab = tab && tabs.includes(tab) ? tab : fallback;

  return (
    <ShopPage
      title={t("Settings")}
      description={t("How you get paid and deliver, what checkout asks, and your store's details.")}
    >
      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full max-w-xl rounded-lg" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : isError ? (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("Could not load your shop settings")}</EmptyTitle>
            <EmptyDescription>{getApiErrorMessage(error, t("Please try again."))}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Tabs
          value={active}
          onValueChange={(value: SettingsTab) =>
            void navigate({ to: SHOP_PATHS.settings, search: { tab: value }, replace: true })
          }
          className="gap-5"
        >
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList>
              {tabs.map((id) => (
                <TabsTrigger key={id} value={id}>
                  {settingsTabLabel(t, id)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* Kept mounted so a half-edited tab keeps its draft when you look at another one. */}
          <TabsContent value="payments" keepMounted className="mt-0">
            <PaymentsTab store={store} />
          </TabsContent>
          <TabsContent value="delivery" className="mt-0">
            <DeliveryTab store={store} />
          </TabsContent>
          <TabsContent value="checkout" keepMounted className="mt-0">
            <CheckoutTab store={store} />
          </TabsContent>
          <TabsContent value="store" keepMounted className="mt-0">
            <StoreTab store={store} />
          </TabsContent>
          <TabsContent value="messages" keepMounted className="mt-0">
            <MessagesTab store={store} />
          </TabsContent>
          {hasLegacy && (
            <TabsContent value="legacy" className="mt-0">
              <LegacyTab />
            </TabsContent>
          )}
        </Tabs>
      )}
    </ShopPage>
  );
}
