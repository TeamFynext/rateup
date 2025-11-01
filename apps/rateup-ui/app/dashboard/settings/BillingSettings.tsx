import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useElementSize } from "@mantine/hooks";
import dayjs from "dayjs";
import {
  AlertCircle,
  Bot,
  Boxes,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  ClipboardX,
  Clock,
  CreditCard,
  DollarSign,
  Gift,
  Info,
  Link,
  Loader2,
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
import { useTranslations } from "next-intl";

import {
  useCancelRazorpaySubscriptionMutation,
  useCreateCheckoutSession,
  useUpdateSubscriptionOrder,
  useUserOrgOrders,
} from "@/backend/payment/payment.query";
import { useCancelStripeSubscriptionMutation } from "@/backend/payment/stripe/stripe.query";
import { useUsageStats } from "@/backend/stats/stats.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import Pricing from "@/components/HomePage/pages/Pricing";
import { generateListItems } from "@/components/HomePage/pages/Pricing/Card/PricingCard";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { checkExpiry } from "@/components/Premium/ExpiryComponent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/context/UserContext";
import { formatIsoDateString } from "@/utils/dateTime";
import { showLoadingToast } from "@/utils/notifications";

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const createCheckout = useCreateCheckoutSession(setIsLoading, setOrder);
  const { user } = useUser();
  const router = useRouter();
  const translations = useTranslations();
  const {
    data: subscription,
    isPending,
    refetch,
    isRefetching,
  } = useSubscription();
  const {
    data: orders,
    refetch: refreshOrders,
    isRefetching: isRefetchOrders,
  } = useUserOrgOrders();
  const updateOrderMut = useUpdateSubscriptionOrder(order?.id);

  const [activeOrderData, setActiveOrderData] = useState(null);
  const [latestOrderData, setLatestOrderData] = useState(null);

  const [isAnnualMessageLimit, setIsAnnualMessageLimit] = useState(false);

  useEffect(() => {
    let order = orders?.data?.filter(
      (o) => o.subscriptionId === subscription?.subscriptionRef,
    );
    order?.length > 0 && setActiveOrderData(order[0]);

    let sorted = orders?.data?.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    sorted?.length && setLatestOrderData(sorted[0]);
  }, [subscription, orders]);

  const [opened, setOpened] = useState(false);
  const [summaryView, setSummaryView] = useState(false);

  // Modal control functions
  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const openSummary = () => setSummaryView(true);
  const closeSummary = () => setSummaryView(false);

  const { cart, reset } = useRouteAndCartStore();
  const [selectedRateupPlan, setselectedRateupPlan] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  //data to be recevied from pricing page

  const checkoutDetails = {
    planId: cart?.planId,
    rateupPlanId: cart?.id,
    planName: cart?.name,
    period: cart?.period,
    orgId: user?.orgId,
    isAnnualMessageLimit,
    trialDays: cart?.trialDays,
  };

  async function displayRazorpay() {
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js",
    );

    if (!res) {
      alert(translations("Razropay failed to load!!"));
      return;
    }

    if (order?.subscriptionId && selectedRateupPlan) {
      var options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_API_KEY,
        subscription_id: order?.subscriptionId,
        name: translations("RateUp Payment"),
        description: "Subscription Plans in Rateup",
        image: "https://djd7kjh9uwow0.cloudfront.net/images/logo.svg",
        handler: function (response) {
          console.log(translations("Payment Successful!"));
          setProcessingPayment(false);
          if (order.hasTrial) {
            updateOrderMut.mutate({
              status: "COMPLETE",
              paymentStatus: "SUCCESS",
              subscriptionStatus: "authenticated",
            });
          } else {
            refreshOrders();
          }
          //alert("Payment Successful!");
        },
        prefill: {
          name: user?.userName,
          email: user?.email,
          contact: user?.orgPhone,
        },
        notes: {
          rateupOrderId: order?.id,
          rateupPlanId: selectedRateupPlan,
          subId: order?.subscriptionId,
          orgId: user?.orgId,
          subExpiry: dayjs
            .unix(order?.subExpiry)
            .format("YYYY-MM-DDTHH:mm:ss.sssZ"),
        },
        theme: {
          color: "#1C518E",
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            setselectedRateupPlan("");
          },
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    }
  }

  useEffect(() => {
    if (order) {
      displayRazorpay();
    }
  }, [order]);

  useEffect(() => {
    if (cart.id) {
      setselectedRateupPlan(cart?.id);
      open();
    }
  }, [cart.id]);

  const isSubscriber = () => {
    return (
      checkExpiry(subscription?.expiresAt) ||
      subscription?.basePlan?.name === "RATEUP TRIAL" ||
      subscription?.basePlan?.name === "FREE PLAN"
    );
  };

  let enablePurchase =
    isSubscriber() || activeOrderData?.subscriptionStatus === "cancelled";

  function handleRefresh() {
    refetch();
    refreshOrders();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Billing & Subscription</h2>
          <p className="text-sm text-muted-foreground">
            Manage your subscription plan and payment methods
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Button
            onClick={handleRefresh}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
            {translations("Refresh")}
          </Button>
        </div>
      </div>
      <Billing
        subscription={subscription}
        activeOrderData={activeOrderData}
        latestOrderData={latestOrderData}
        processingPayment={processingPayment}
        refetch={refetch}
        refreshOrders={refreshOrders}
        isRefetching={isRefetching}
      />
      <UsageCard subscription={subscription} />
      <OrderHistory
        orders={orders?.data}
        refresh={refreshOrders}
        isRefetching={isRefetchOrders}
      />
      {/* Order Confirmation Modal */}
      <Dialog
        open={opened}
        onOpenChange={(open) => {
          if (!open) {
            close();
            reset();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {enablePurchase
                ? translations("Confirm your Order")
                : translations("Buy Rateup Premium")}
            </DialogTitle>
          </DialogHeader>

          {enablePurchase ? (
            <div className="py-6">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                {/* Plan Details Section */}
                <div className="space-y-4 flex-shrink-0">
                  {cart?.period === "yearly" && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="annual-limit"
                        checked={isAnnualMessageLimit}
                        onCheckedChange={setIsAnnualMessageLimit}
                      />
                      <Label htmlFor="annual-limit" className="cursor-pointer">
                        Annual Message limit
                      </Label>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">{cart?.name}</h3>
                    <p className="text-xl font-semibold text-muted-foreground">
                      {cart?.currencySymbol}
                      {cart?.amount}{" "}
                      <span className="text-base">/{cart?.period}</span>
                    </p>
                  </div>
                </div>

                {/* Features Section */}
                <div className="space-y-4 flex-1">
                  <h4 className="text-lg font-semibold">
                    {translations("Plan Features")}
                  </h4>
                  <div className="space-y-2">
                    {cart?.description && generateListItems(cart?.description)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 max-w-lg space-y-6">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-5 w-5 text-blue-600" />
                <AlertDescription className="ml-2">
                  <p className="text-sm text-blue-900">
                    {translations(
                      "You have an active Base Plan already So you cannot buy another Rateup base plan But you can buy the available ADDON RateUp plan to get more features",
                    )}
                  </p>
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-4 px-4">
                <h4 className="text-lg font-semibold min-w-[140px]">
                  {translations("Current Plan :")}
                </h4>
                <p className="text-base text-muted-foreground">
                  {subscription?.basePlan?.displayName}
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <Button className="w-full sm:w-auto">Buy Addons</Button>
              </div>
            </div>
          )}

          {enablePurchase && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  close();
                  reset();
                }}
                disabled={isLoading}
              >
                {translations("Cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (cart.gateway === "STRIPE") {
                    close();
                    router.push(
                      `/dashboard/payment/checkout?pid=${cart.priceId}`,
                    );
                  } else {
                    setProcessingPayment(true);
                    createCheckout.mutate(checkoutDetails, {
                      onSettled: (data) => {
                        setIsAnnualMessageLimit(false);
                      },
                    });
                    close();
                    reset();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  translations("Continue to Payment")
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {/* order summary */}
      <Dialog
        open={summaryView}
        onOpenChange={(open) => {
          if (!open) {
            closeSummary();
            reset();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
              {translations("Order Processing Started 🎉")}
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-4 min-w-[350px]">
            <div className="space-y-4">
              <p className="text-green-600 font-semibold text-lg">
                {translations("Your payment was successful!")}
              </p>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {translations(
                    "Thank you for choosing Rateup Premium subscription",
                  )}
                </p>
                <p>
                  {translations(
                    "You can enjoy Rateup Premium features once your order is processed successfully",
                  )}
                </p>
                <p>{translations("You will be notified by email shortly")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                closeSummary();
              }}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {translations("Continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsageCard({ subscription }) {
  const { data: stats, refetch, isRefetching, isLoading } = useUsageStats();

  return (
    <Card className="p-6 shadow-sm border-gray-200">
      <h3 className="">Usage Stats</h3>
      <div className="flex flex-col justify-center gap-4">
        <TeamStats
          stats={stats}
          subscription={subscription}
          isRefetching={isRefetching}
          refetch={refetch}
        />
        <SurveyStats stats={stats} subscription={subscription} />
        <MenuStats stats={stats} subscription={subscription} />
        <WhatsappStats stats={stats} subscription={subscription} />
        <AIStats stats={stats} subscription={subscription} />
        <LoyaltyStats stats={stats} subscription={subscription} />
      </div>
    </Card>
  );
}

const TeamStats = ({ stats, refetch, isRefetching, subscription }) => {
  const translations = useTranslations();
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
    <Card className="p-6 shadow-sm border-gray-200">
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
                  className="bg-gradient-to-r from-rateup-blue to-rateup-orange h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {percentage.toFixed(0)}% used • {remaining.toLocaleString()}{" "}
                remaining
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const MenuStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const isActive = subscription?.features?.menu?.active;
  if (!isActive) return null;

  const statsArray = [
    {
      count: stats?.menusCount,
      totalCount: subscription?.features?.menu?.count?.max,
      stats: "Menus",
    },
    {
      count: stats?.monthlyMenuViews,
      totalCount: subscription?.features?.menu?.count?.monthlyViewLimit,
      stats: "Monthly Menu view",
    },
    {
      count: stats?.menuViewsCount,
      stats: "Total Menu view",
    },
  ];

  return (
    <Card className="p-6 shadow-sm border-gray-200">
      <h3 className="flex items-center gap-1">
        <Boxes className="w-4 h-4" />
        {translations("Menu")}
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
                      className="bg-gradient-to-r from-rateup-blue to-rateup-orange h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used • {remaining.toLocaleString()}{" "}
                    remaining
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

const SurveyStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const isActive = subscription?.features?.webSurvey?.active;
  if (!isActive) return null;

  const statsArray = [
    {
      count: stats?.monthlySurveyResponses,
      totalCount:
        subscription?.features?.webSurvey?.count?.monthlyResponseLimit,
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
    <Card className="p-6 shadow-sm border-gray-200">
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
                      className="bg-gradient-to-r from-rateup-blue to-rateup-orange h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used • {remaining.toLocaleString()}{" "}
                    remaining
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

const WhatsappStats = ({ stats, subscription }) => {
  const translations = useTranslations();
  const isActive = subscription?.features?.whatsapp?.active;
  if (!isActive) return null;

  const statsArray = [
    {
      count: subscription?.isAnnualMessageLimit
        ? stats?.annualTemplateMessageCount
        : stats?.monthlyTemplateMessageCount,
      totalCount: subscription?.isAnnualMessageLimit
        ? subscription?.features?.whatsapp?.count?.monthlyMessageLimit * 12
        : subscription?.features?.whatsapp?.count?.monthlyMessageLimit,
      stats: subscription?.isAnnualMessageLimit
        ? "Annual Message"
        : "Monthly Message",
    },
    {
      count: stats?.waSurveysCount,
      totalCount: subscription?.features?.whatsapp?.flow?.count?.max,
      stats: "Flow Surveys",
    },
    {
      count: stats?.waAutomationCount,
      totalCount: subscription?.features?.whatsapp?.automation?.count?.max,
      stats: "Automation",
    },
    {
      count: stats?.monthlyAutomationTriggerCount,
      totalCount:
        subscription?.features?.whatsapp?.automation?.automationTrigger?.count
          ?.max,
      stats: "Monthly Automation Trigger",
    },
    {
      count: stats?.templateMessagesCount,
      stats: "Total Message",
    },
  ];

  return (
    <Card className="p-6 shadow-sm border-gray-200">
      <h3 className="flex items-center gap-1">
        <MessageCircle className="w-4 h-4" />
        {translations("Whatsapp")}
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
                      className="bg-gradient-to-r from-rateup-blue to-rateup-orange h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used • {remaining.toLocaleString()}{" "}
                    remaining
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

const AIStats = ({ stats, subscription }) => {
  const translations = useTranslations();
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
                      className="bg-gradient-to-r from-rateup-blue to-rateup-orange h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used • {remaining.toLocaleString()}{" "}
                    remaining
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

const LoyaltyStats = ({ stats, subscription }) => {
  const translations = useTranslations();
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
    <Card className="p-6 shadow-sm border-gray-200">
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
                      className="bg-gradient-to-r from-rateup-blue to-rateup-orange h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}% used • {remaining.toLocaleString()}{" "}
                    remaining
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

function OrderHistory({ orders, refresh, isRefetching }) {
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Card className="p-6 shadow-sm border-gray-200">
        <div className="flex items-center justify-between">
          <h3>Billing History</h3>
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
            Refresh
          </Button>
        </div>
        {orders?.length === 0 ? (
          <div className="flex items-center justify-center gap-1 p-8">
            <ClipboardX />
            No Orders Found
          </div>
        ) : (
          <div className="space-y-3">
            {orders
              ?.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-rateup-blue/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm">
                        {" "}
                        {formatIsoDateString(item?.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item?.id}
                      </p>
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
                      Details
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

const OrderStatusBadge = ({ order }) => {
  const translations = useTranslations();
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
        statusText = translations(order?.status) || order?.status;
      }
      break;
    case "FAILED":
      color = "red";
      statusText = translations(order?.status) || order?.status;
      break;
    default:
      color = "green";
      statusText = translations(order?.status) || order?.status;
  }

  return <Badge style={{ backgroundColor: color }}>{statusText}</Badge>;
};

const Billing = ({
  subscription,
  activeOrderData,
  latestOrderData,
  processingPayment,
  refetch,
  refreshOrders,
  isRefetching,
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
  const translations = useTranslations();
  const router = useRouter();

  const handleCancelSubscription = () => {
    showLoadingToast(
      translations("Hold your subscription is getting cancelled"),
      "load-data",
      true,
      translations("Cancelling Subscription"),
    );

    if (subscription?.basePlan?.stripeProduct) {
      CancelStripeSubscription.mutate(null, {
        onSuccess: (r) => {
          setCancelResult(true);
          setCancelDialogOpened(false);
        },
      });
    } else {
      CancelRazorpaySubscription.mutate(null, {
        onSuccess: (r) => {
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
        <p>Processing....</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Processing Plan Alert */}
        {isProcessingPlan && (
          <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertDescription>
              <div className="flex items-center justify-between gap-4 ml-2">
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900">
                    {translations("Your plan activation is under process")}
                  </p>
                  <p className="text-sm text-blue-800">
                    {translations(
                      "You will receive activation status via email shortly",
                    )}
                  </p>
                  <p className="text-xs text-blue-700">
                    {translations("Usually takes between 30seconds to 15 mins")}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefetching}
                  variant="outline"
                  className="shrink-0 border-blue-300 hover:bg-blue-50"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                  />
                  {translations("Refresh Status")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6 space-y-6">
            {/* Plan Header */}
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center justify-between w-full">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">
                      {translations("Plan Name")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold">
                      {subscription?.basePlan?.displayName ||
                        translations("No Plan")}
                    </h3>
                    {latestOrderData?.subscriptionStatus ===
                      "authenticated" && (
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
                      onClick={() => router.push("/pricing")}
                      className="gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      {translations("Upgrade plan")}
                    </Button>
                  ) : (
                    subscription?.basePlan?.name &&
                    (activeOrderData?.subscriptionStatus === "cancelled" &&
                    !isCustomPlan ? (
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
                    <Button
                      onClick={() => setCustomUpgradeModal(true)}
                      className="gap-2"
                    >
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
                      <span className="font-medium">
                        {translations("Next Charging on:")}
                      </span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatIsoDateString(
                        activeOrderData?.subscriptionChargeAt,
                      )}
                    </p>
                  </div>
                )}

              {activeOrderData?.subscriptionStatus === "cancelled" &&
                activeOrderData?.subscriptionEndedAt &&
                !isCustomPlan && (
                  <div className="space-y-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4" />
                      <span className="font-medium">
                        {translations("Cancelled on:")}
                      </span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatIsoDateString(
                        activeOrderData?.subscriptionEndedAt,
                      )}
                    </p>
                  </div>
                )}
            </div>

            {/* Action Button */}
            {/* <div className="flex justify-end">
              {subscription?.basePlan?.name === "RATEUP TRIAL" ||
              (isFreePlan && !isCustomPlan && !isProcessingPlan) ? (
                <Button
                  onClick={() => router.push("/pricing")}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  {translations("Upgrade plan")}
                </Button>
              ) : (
                subscription?.basePlan?.name &&
                (activeOrderData?.subscriptionStatus === "cancelled" &&
                !isCustomPlan ? (
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
                <Button
                  onClick={() => setCustomUpgradeModal(true)}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  {translations("Upgrade plan")}
                </Button>
              )}
            </div> */}

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
                    {isFreePlan
                      ? "NA"
                      : formatIsoDateString(subscription?.expiresAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        checkExpiry(subscription?.expiresAt)
                          ? "destructive"
                          : "default"
                      }
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
                    {checkExpiry(subscription?.expiresAt) &&
                      !isProcessingPlan && (
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
                  <span className="font-medium">
                    {translations("Billing Cycle")}
                  </span>
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
                  <span className="font-medium">
                    {translations("Plan Cost")}
                  </span>
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
                      <span className="font-medium">
                        {translations("Addons")}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-muted-foreground">
                      {translations("Nil")}
                    </p>
                  </div>
                  {!["FREE PLAN", "RATEUP TRIAL"].includes(
                    subscription?.basePlan?.name,
                  ) &&
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
            <Pricing
              isAccount={true}
              handleSelection={() => setOpenedUpgradeModal(false)}
            />
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
                {translations(
                  "Your current Rateup plan subscription is successfully cancelled",
                )}
              </p>
              <p>
                {translations(
                  "You can still enjoy the premium features until the validity expires",
                )}
              </p>
              <p>
                {translations(
                  "Also your existing base plan benefits will be replaced on an upgrade",
                )}
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Need help?</span>
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
              <p>{translations("Connect Rateup billing team via email")}</p>
            </div>
            <Separator />
            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Contact us at
              </span>
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
              {translations(
                "Are you sure you want to cancel your active subscription?",
              )}{" "}
              You will lose access to premium features once the current billing
              period ends.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpened(false)}
            >
              {translations("Close ")}
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
