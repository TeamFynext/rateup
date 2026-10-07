import { IconChartBar, IconCreditCard, IconReceipt, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { BillingHistory } from "@/components/dashboard/settings/billing/BillingHistory.tsx";
import { PlanFeatures } from "@/components/dashboard/settings/billing/PlanFeatures.tsx";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import { AddonPacks } from "./AddonPacks.tsx";
import { BillingSummary } from "./BillingSummary.tsx";
import { ChangePlanDialog } from "./ChangePlanDialog.tsx";
import { CancelPlanDialog } from "./dialogs/CancelPlanDialog.tsx";
import { ChoosePlanDialog, ContactSalesDialog } from "./dialogs/ChoosePlanDialog.tsx";
import { ConfirmOrderDialog } from "./dialogs/ConfirmOrderDialog.tsx";
import { PlanCard } from "./PlanCard.tsx";
import { UsageMeters } from "./UsageMeters.tsx";
import { useBillingData } from "./useBillingData.ts";
import { usePlanCheckout } from "./usePlanCheckout.ts";

type BillingTab = "plan" | "usage" | "history";

/**
 * Billing, in three tabs behind one summary: the strip answers the three questions people
 * come here for, the tabs hold the detail, and `useBillingData` derives all of it once.
 */
export function BillingPage({ tab }: Readonly<{ tab: BillingTab }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const data = useBillingData();
  const { cart, reset: resetCart } = useRouteAndCartStore();

  const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
  const [choosePlanOpen, setChoosePlanOpen] = useState(false);
  const [contactSalesOpen, setContactSalesOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const checkout = usePlanCheckout({ onSettled: data.refreshAll });

  // The tab lives in the URL, so a link can open Usage or History directly and a reload
  // stays where the reader was.
  function setTab(next: BillingTab) {
    navigate({ to: "/dashboard/settings/billing", search: { tab: next }, replace: true });
  }

  // Arriving from the pricing page with a plan in the cart opens the confirmation step.
  useEffect(() => {
    if (cart.id) setConfirmOrderOpen(true);
  }, [cart.id]);

  // Packs are paid-plan only; a free org's remedy is a plan.
  const upgrade = data.state.isFreePlan ? () => setChoosePlanOpen(true) : undefined;

  function closeConfirmOrder() {
    setConfirmOrderOpen(false);
    resetCart();
  }

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-2xl">{t("Billing & Subscription")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Your plan, what you have used, and everything you have been charged.")}
          </p>
        </div>
        <Button onClick={data.refreshAll} disabled={data.isRefreshing} variant="outline" size="sm">
          <IconRefresh className={data.isRefreshing ? "size-4 animate-spin" : "size-4"} />
          {t("Refresh")}
        </Button>
      </div>

      <BillingSummary data={data} onJumpToUsage={() => setTab("usage")} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as BillingTab)}>
        <TabsList>
          <TabsTrigger value="plan">
            <IconCreditCard />
            {t("Plan")}
          </TabsTrigger>
          <TabsTrigger value="usage">
            <IconChartBar />
            {t("Usage")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <IconReceipt />
            {t("History")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="flex flex-col gap-4">
          <PlanCard
            data={data}
            isBusy={checkout.isProcessing}
            onBuy={() =>
              data.state.isSalesLedPlan ? setContactSalesOpen(true) : setChoosePlanOpen(true)
            }
            onChangePlan={() => setChangePlanOpen(true)}
            onCancel={() => setCancelOpen(true)}
          />
          <PlanFeatures plan={data.currentPlan} subscription={data.subscription} />
        </TabsContent>

        <TabsContent value="usage">
          <UsageMeters
            subscription={data.subscription}
            contactPacks={
              <div className="mt-3">
                <AddonPacks
                  kind="active-contacts"
                  offer={data.contactPacks.offer}
                  isPending={data.contactPacks.isPending}
                  onBuy={checkout.startPackCheckout}
                  isPurchasing={checkout.isProcessing}
                  onUpgrade={upgrade}
                />
              </div>
            }
            creditPacks={
              <div className="mt-3">
                <AddonPacks
                  kind="campaign-credits"
                  offer={data.creditPacks.offer}
                  isPending={data.creditPacks.isPending}
                  onBuy={checkout.startPackCheckout}
                  isPurchasing={checkout.isProcessing}
                  onUpgrade={upgrade}
                />
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="history">
          <BillingHistory
            invoices={data.invoices}
            orders={data.orders}
            isPending={data.invoicesPending}
          />
        </TabsContent>
      </Tabs>

      <ConfirmOrderDialog
        open={confirmOrderOpen}
        onOpenChange={(open) => !open && closeConfirmOrder()}
        isStarting={checkout.isStartingCheckout}
        onConfirm={() => {
          checkout.startPlanCheckout(
            {
              planId: cart?.planId,
              rateupPlanId: cart?.id,
              planName: cart?.name,
              period: cart?.period,
              orgId: user?.orgId,
              // Required by the checkout body; it no longer changes any limit.
              isAnnualMessageLimit: false,
            },
            { gateway: cart?.gateway, priceId: cart?.priceId },
          );
          closeConfirmOrder();
        }}
      />

      <ChoosePlanDialog open={choosePlanOpen} onOpenChange={setChoosePlanOpen} />
      <ContactSalesDialog open={contactSalesOpen} onOpenChange={setContactSalesOpen} />

      <ChangePlanDialog
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        plans={data.catalogPlans ?? []}
        currentPlanId={data.subscription?.basePlan?.id}
        currentCadence={data.cost.cadence === "month" ? "monthly" : "yearly"}
        renewsOn={
          data.activeOrder?.subscriptionChargeAt
            ? formatIsoDateString(data.activeOrder.subscriptionChargeAt)
            : undefined
        }
      />

      <CancelPlanDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        subscription={data.subscription}
        onCancelled={data.refreshAll}
      />
    </div>
  );
}
