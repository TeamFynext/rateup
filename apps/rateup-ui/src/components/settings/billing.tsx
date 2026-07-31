import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  ClipboardX,
  Clock,
  DollarSign,
  Gift,
  Info,
  Mail,
  MessageCircle,
  Package,
  RefreshCcw,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCancelRazorpaySubscriptionMutation } from "@/backend/payment/payment.query";
import { useCancelStripeSubscriptionMutation } from "@/backend/payment/stripe/stripe.query";
import type { UsageStats } from "@/backend/stats/stats.api";
import { useUsageStats } from "@/backend/stats/stats.query";
import Pricing from "@/components/HomePage/pages/Pricing/index.tsx";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

/** A payment order row, as the orders endpoint returns it. */
export interface PaymentOrder {
  id: string;
  subscriptionId?: string;
  hasTrial?: boolean;
  subExpiry?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
  status?: string;
  paymentStatus?: string;
  subscriptionStatus?: string;
  subscriptionChargeAt?: string;
  subscriptionEndedAt?: string;
}

export function UsageCard({ subscription }: { subscription?: Subscription }) {
  const { t: translations } = useTranslation();
  const { data: stats, refetch, isFetching } = useUsageStats();

  return (
    <Card className="p-6 ">
      <div className="flex items-center justify-between">
        <h3 className="">Usage Stats</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCcw
            className={`w-4 h-4 transition-transform ${isFetching ? "animate-spin" : ""}`}
          />
          {translations("Refresh")}
        </Button>
      </div>
      <div className="flex flex-col justify-center gap-4">
        <TeamStats stats={stats} subscription={subscription} />
        <SurveyStats stats={stats} subscription={subscription} />
        <WhatsappStats stats={stats} subscription={subscription} />
        <AIStats stats={stats} subscription={subscription} />
        <LoyaltyStats stats={stats} subscription={subscription} />
      </div>
    </Card>
  );
}

export function OrderHistory({
  orders,
  refresh,
  isRefetching,
}: {
  orders: PaymentOrder[] | undefined;
  refresh: () => void;
  isRefetching: boolean;
}) {
  const { t: translations } = useTranslation();
  // Write-only: kept so the details button records the row it opened.
  const [, setSelectedOrder] = useState<PaymentOrder[] | PaymentOrder>([]);
  const [, setOpened] = useState(false);
  return (
    <>
      <Card id="order-history" className="p-6 ">
        <div className="flex items-center justify-between">
          <h3>{translations("Billing History")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefetching}
            className="flex items-center gap-2"
          >
            <RefreshCcw
              className={`w-4 h-4 transition-transform ${isRefetching ? "animate-spin" : ""}`}
            />
            {translations("Refresh")}
          </Button>
        </div>
        {orders?.length === 0 ? (
          <div className="flex items-center justify-center gap-1 p-8">
            <ClipboardX />
            {translations("No Orders Found")}
          </div>
        ) : (
          <div className="space-y-3">
            {orders
              ?.sort(
                (a, b) =>
                  new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime(),
              )
              .map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm"> {formatIsoDateString(item?.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{item?.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>
                      {item?.currency === "INR" ? "₹" : "$"}
                      {item?.amount}/-
                    </span>
                    <OrderStatusBadge order={item} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(item);
                        setOpened(true);
                      }}
                    >
                      {translations("Details")}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </>
  );
}

const OrderStatusBadge = ({ order }: { order: PaymentOrder }) => {
  const { t: translations } = useTranslation();
  let color, statusText;

  switch (order?.status) {
    case "PENDING":
      if (order?.paymentStatus === "SUCCESS") {
        color = "blue";
        statusText = translations("PROCESSING");
      } else if (order?.paymentStatus === "FAILED") {
        color = "red";
        statusText = translations("FAILED");
      } else {
        color = "yellow";
        statusText = order?.status;
      }
      break;
    case "FAILED":
      color = "red";
      statusText = order?.status;
      break;
    default:
      color = "green";
      statusText = order?.status;
  }

  return <Badge style={{ backgroundColor: color }}>{statusText}</Badge>;
};

export const Billing = ({
  subscription,
  activeOrderData,
  latestOrderData,
  processingPayment,
  refetch,
  refreshOrders,
  isRefetching,
}: {
  subscription?: Subscription;
  activeOrderData: PaymentOrder | null;
  latestOrderData: PaymentOrder | null;
  processingPayment: boolean;
  refetch: () => void;
  refreshOrders: () => void;
  isRefetching: boolean;
}) => {
  const [openedUpgradeModal, setOpenedUpgradeModal] = useState(false);
  const [customUpgradeModal, setCustomUpgradeModal] = useState(false);
  const [cancelResult, setCancelResult] = useState(false);
  const [cancelDialogOpened, setCancelDialogOpened] = useState(false);

  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [isProcessingPlan, setIsProcessingPlan] = useState(
    latestOrderData?.subscriptionStatus === "pending" || false,
  );
  const [isShopifyPlan, setIsShopifyPlan] = useState(false);
  const isFreePlan = useMemo(
    () => subscription && subscription?.basePlan?.name?.includes("FREE"),
    [subscription],
  );

  useEffect(() => {
    if (
      subscription?.basePlan?.name &&
      subscription.basePlan.name.toUpperCase().includes("CUSTOM")
    ) {
      setIsCustomPlan(true);
    } else {
      setIsCustomPlan(false);
    }
    if (subscription?.shopifyPlanId) setIsShopifyPlan(true);
    else setIsShopifyPlan(false);
  }, [subscription?.basePlan?.name]);

  useEffect(() => {
    setIsProcessingPlan(latestOrderData?.subscriptionStatus === "pending");
  }, [latestOrderData?.subscriptionStatus]);

  const CancelRazorpaySubscription = useCancelRazorpaySubscriptionMutation();
  const CancelStripeSubscription = useCancelStripeSubscriptionMutation();
  const { t: translations } = useTranslation();
  const navigate = useNavigate();

  const handleCancelSubscription = () => {
    toast.loading(translations("Hold.. your subscription is getting cancelled..."), {
      id: "load-data",
    });

    if (subscription?.basePlan?.stripeProduct) {
      CancelStripeSubscription.mutate(undefined, {
        onSuccess: (_r) => {
          setCancelResult(true);
          setCancelDialogOpened(false);
        },
      });
    } else {
      CancelRazorpaySubscription.mutate(undefined, {
        onSuccess: (_r) => {
          setCancelResult(true);
          setCancelDialogOpened(false);
        },
      });
    }
  };

  function handleRefresh() {
    refetch();
    refreshOrders();
  }

  if (processingPayment) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center">
        <p>{translations("Processing")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Processing Plan Alert */}
        {isProcessingPlan && (
          <Alert className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100/50">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertDescription>
              <div className="flex items-center justify-between gap-4 ml-2">
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900">
                    {translations("Your plan activation is under process.")}
                  </p>
                  <p className="text-sm text-blue-800">
                    {translations("You will receive activation status via email shortly.")}
                  </p>
                  <p className="text-xs text-blue-700">
                    {translations("Usually takes between 30seconds to 15 mins.")}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefetching}
                  variant="outline"
                  className="shrink-0 border-blue-300 hover:bg-blue-50"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                  {translations("Refresh Status")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Plan Header */}
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center justify-between w-full">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{translations("Plan Name")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold">
                      {subscription?.basePlan?.displayName || translations("No Plan")}
                    </h3>
                    {latestOrderData?.subscriptionStatus === "authenticated" && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {translations("Trial Period")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  {subscription?.basePlan?.name === "RATEUP TRIAL" ||
                  (isFreePlan && !isCustomPlan && !isProcessingPlan) ? (
                    <Button
                      onClick={() =>
                        navigate({
                          to: "/pricing",
                        })
                      }
                      className="gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      {translations("Upgrade plan")}
                    </Button>
                  ) : (
                    subscription?.basePlan?.name &&
                    (activeOrderData?.subscriptionStatus === "cancelled" && !isCustomPlan ? (
                      <Button disabled variant="secondary" className="gap-2">
                        <X className="h-4 w-4" />
                        {translations("Cancelled")}
                      </Button>
                    ) : (
                      !isCustomPlan &&
                      !isProcessingPlan &&
                      !isShopifyPlan && (
                        <Button
                          variant="destructive"
                          onClick={() => setCancelDialogOpened(true)}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          {translations("Cancel Subscription")}
                        </Button>
                      )
                    ))
                  )}

                  {isCustomPlan && (
                    <Button onClick={() => setCustomUpgradeModal(true)} className="gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {translations("Upgrade plan")}
                    </Button>
                  )}
                </div>
              </div>

              {activeOrderData?.subscriptionChargeAt &&
                activeOrderData?.subscriptionStatus !== "cancelled" &&
                !isCustomPlan && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{translations("Next Charging on")}:</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatIsoDateString(activeOrderData?.subscriptionChargeAt)}
                    </p>
                  </div>
                )}

              {activeOrderData?.subscriptionStatus === "cancelled" &&
                activeOrderData?.subscriptionEndedAt &&
                !isCustomPlan && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4" />
                      <span className="font-medium">{translations("Cancelled on")}:</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatIsoDateString(activeOrderData?.subscriptionEndedAt)}
                    </p>
                  </div>
                )}
            </div>

            <Separator />

            {/* Plan Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {subscription?.basePlan?.paymentPlanId
                      ? translations("Next Due")
                      : translations("Validity")}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold">
                    {isFreePlan ? "NA" : formatIsoDateString(subscription?.expiresAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={checkExpiry(subscription?.expiresAt) ? "destructive" : "default"}
                      className="gap-1"
                    >
                      {checkExpiry(subscription?.expiresAt) ? (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          {translations("Expired")}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          {translations("Active")}
                        </>
                      )}
                    </Badge>
                    {checkExpiry(subscription?.expiresAt) && !isProcessingPlan && (
                      <Button
                        size="sm"
                        onClick={() => setOpenedUpgradeModal(true)}
                        className="gap-1"
                      >
                        <TrendingUp className="h-3 w-3" />
                        {translations("Upgrade")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{translations("Billing Cycle")}</span>
                </div>
                <p className="text-base font-semibold">
                  {(subscription?.basePlan?.paymentPlan?.period ||
                    subscription?.basePlan?.stripeProduct?.interval) ??
                    (isShopifyPlan ? "Monthly" : "----")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">{translations("Plan Cost")}</span>
                </div>
                {isShopifyPlan ? (
                  <a
                    href="https://admin.shopify.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-semibold text-primary hover:underline inline-flex items-center gap-2"
                  >
                    See in Shopify
                    <TrendingUp className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-base font-semibold">
                    {subscription?.basePlan?.paymentPlan?.amount
                      ? `${subscription?.basePlan?.paymentPlan?.currency} ${subscription.basePlan.paymentPlan.amount}`
                      : subscription?.basePlan?.stripeProduct?.amount
                        ? `$${subscription.basePlan.stripeProduct.amount}`
                        : "----"}
                  </p>
                )}
              </div>
            </div>

            {!isCustomPlan && !isProcessingPlan && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">{translations("Addons")}</span>
                    </div>
                    <p className="text-base font-semibold text-muted-foreground">
                      {translations("Nil")}
                    </p>
                  </div>
                  {!["FREE PLAN", "RATEUP TRIAL"].includes(subscription?.basePlan?.name ?? "") &&
                    activeOrderData?.subscriptionStatus === "cancelled" && (
                      <Button
                        onClick={() => setOpenedUpgradeModal(true)}
                        size="sm"
                        className="gap-2"
                      >
                        <TrendingUp className="h-4 w-4" />
                        {translations("Upgrade plan")}
                      </Button>
                    )}
                </div>
              </>
            )}

            <Separator />

            {/* Support Section */}
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {translations("*For Custom Plans / Support / Assistance")}
              </p>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href="mailto:hello@rateup.app"
                  className="text-sm font-medium hover:underline text-primary"
                >
                  hello@rateup.app
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Upgrade Modal */}
      <Dialog open={openedUpgradeModal} onOpenChange={setOpenedUpgradeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {translations("Upgrade Your Plan")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Pricing isAccount={true} handleSelection={() => setOpenedUpgradeModal(false)} />
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Result Modal */}
      <Dialog open={cancelResult} onOpenChange={setCancelResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {translations("Subscription Cancelled !")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                {translations("Your current Rateup plan subscription is successfully cancelled.")}
              </p>
              <p>
                {translations(
                  "You can still enjoy the premium features until the validity expires.",
                )}
              </p>
              <p>
                {translations(
                  "Also your existing base plan benefits will be replaced on an upgrade.",
                )}
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{translations("Need help")}?</span>
              <a
                href="mailto:hello@rateup.app"
                className="text-sm font-medium hover:underline text-primary"
              >
                hello@rateup.app
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Custom Upgrade Modal */}
      <Dialog open={customUpgradeModal} onOpenChange={setCustomUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {translations("Upgrade Custom Plan")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{translations("For Upgrading your Custom Plan,")}</p>
              <p>{translations("Connect Rateup billing team via email.")}</p>
            </div>
            <Separator />
            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{translations("Contact us at")}</span>
              <a
                href="mailto:hello@rateup.app"
                className="text-sm font-medium hover:underline text-primary"
              >
                hello@rateup.app
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpened} onOpenChange={setCancelDialogOpened}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {translations("Cancel Subscription")}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {translations("Are you sure you want to cancel your active subscription")}?{" "}
              {translations(
                "You will lose access to premium features once the current billing period ends",
              )}
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpened(false)}>
              {translations("Close")}
            </Button>
            <Button onClick={handleCancelSubscription} variant="destructive">
              {translations("Confirm Cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const TeamStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const statsArray = [
    {
      count: stats?.teamsCount,
      totalCount: subscription?.features?.team?.count?.max,
      stats: "Teams",
    },
    {
      count: stats?.teamMembersCount,
      totalCount: subscription?.features?.team?.teamMember?.count?.max,
      stats: "Team Staff",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <Users className="w-4 h-4" />
        {translations("Team")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                <span>
                  {count.toLocaleString()} / {totalCount.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                {translations("remaining")}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const SurveyStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const isActive = subscription?.features?.webSurvey?.active;
  if (!isActive) return null;

  const statsArray = [
    {
      count: stats?.monthlySurveyResponses,
      totalCount: subscription?.features?.webSurvey?.count?.monthlyResponseLimit,
      stats: "Monthly Responses",
    },
    {
      count: stats?.surveysCount,
      totalCount: subscription?.features?.webSurvey?.count?.max,
      stats: "Surveys",
    },
    {
      count: stats?.surveyResponsesCount,
      stats: "Total Responses",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <ClipboardList className="w-4 h-4" />
        {translations("Web Survey")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                {totalCount > 0 ? (
                  <span>
                    {count.toLocaleString()} / {totalCount.toLocaleString()}
                  </span>
                ) : (
                  <span>{count.toLocaleString()}</span>
                )}
              </div>
              {totalCount > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                    {translations("remaining")}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const WhatsappStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const isActive = subscription?.features?.whatsapp?.active;
  if (!isActive) return null;

  const isAnnual = subscription?.isAnnualMessageLimit;
  const label = isAnnual ? "Annual Conversation" : "Monthly Conversation";
  const rawCount =
    (isAnnual ? stats?.annualConversationsCount : stats?.monthlyConversationsCount) || 0;
  const totalCount =
    (isAnnual
      ? (subscription?.features?.whatsapp?.conversation?.count?.max || 0) * 12
      : subscription?.features?.whatsapp?.conversation?.count?.max) || 0;

  // Once usage exceeds the allowance we cap the bar/label at the limit (e.g. 4/4,
  // 100% used, 0 remaining) and surface the surplus separately as "+N more", so
  // the meter never renders past full or shows negative remaining counts.
  const hasLimit = totalCount > 0;
  const displayCount = hasLimit ? Math.min(rawCount, totalCount) : rawCount;
  const overage = hasLimit ? Math.max(rawCount - totalCount, 0) : 0;
  const percentage = hasLimit ? Math.min((rawCount / totalCount) * 100, 100) : 0;
  const remaining = Math.max(totalCount - rawCount, 0);

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <MessageCircle className="w-4 h-4" />
        {translations("Whatsapp")}
      </h3>
      <div className="flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{translations(label)}</span>
          <div className="flex items-center gap-2">
            {hasLimit ? (
              <span>
                {displayCount.toLocaleString()} / {totalCount.toLocaleString()}
              </span>
            ) : (
              <span>{rawCount.toLocaleString()}</span>
            )}
            {overage > 0 && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400">
                +{overage.toLocaleString()} {translations("more")}
              </Badge>
            )}
          </div>
        </div>
        {hasLimit && (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-3 rounded-full transition-all ${
                  overage > 0 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
              {translations("remaining")}
            </p>
          </>
        )}
      </div>
    </Card>
  );
};

const AIStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const aiFeature = subscription?.features?.ai;
  if (!aiFeature || !aiFeature?.active) return null;

  const statsArray = [
    {
      count: stats?.aiPromptTokensCount,
      totalCount: aiFeature?.count.promptTokens,
      stats: "Input Tokens",
    },
    {
      count: stats?.aiCompletionTokensCount,
      totalCount: aiFeature?.count.completionTokens,
      stats: "Output Tokens",
    },
  ];

  return (
    <Card className="p-6 shadow-sm border-gray-200">
      <h3 className="flex items-center gap-1">
        <Bot className="w-4 h-4" />
        {translations("AI")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                {totalCount > 0 ? (
                  <span>
                    {count.toLocaleString()} / {totalCount.toLocaleString()}
                  </span>
                ) : (
                  <span>{count.toLocaleString()}</span>
                )}
              </div>
              {totalCount > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                    {translations("remaining")}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const LoyaltyStats = ({
  stats,
  subscription,
}: {
  stats: UsageStats | undefined;
  subscription?: Subscription;
}) => {
  const { t: translations } = useTranslation();
  const loyalty = subscription?.features?.loyalty;
  if (!loyalty || !loyalty?.active) return null;

  const statsArray = [
    {
      count: stats?.loyaltyActionCount,
      totalCount: loyalty?.action?.count?.max,
      stats: "Actions",
    },
    {
      count: stats?.loyaltyRewardCount,
      totalCount: loyalty?.reward?.count?.max,
      stats: "Rewards",
    },
    {
      count: stats?.loyaltyCustomerCount,
      totalCount: loyalty?.customer?.count?.max,
      stats: "Customers",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-1">
        <Gift className="w-4 h-4" />
        {translations("Loyalty")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
        {statsArray.map((item, index) => {
          const count = item.count || 0;
          const totalCount = item.totalCount || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const remaining = totalCount - count;

          return (
            <div key={index} className="flex flex-col justify-center gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.stats}</span>
                {totalCount > 0 ? (
                  <span>
                    {count.toLocaleString()} / {totalCount.toLocaleString()}
                  </span>
                ) : (
                  <span>{count.toLocaleString()}</span>
                )}
              </div>
              {totalCount > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% {translations("used")} • {remaining.toLocaleString()}{" "}
                    {translations("remaining")}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
