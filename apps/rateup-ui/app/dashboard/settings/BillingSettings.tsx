import { useEffect, useMemo, useState } from "react";

import {
  Bot,
  Boxes,
  ClipboardList,
  ClipboardX,
  Gift,
  MessageCircle,
  RefreshCcw,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useUserOrgOrders } from "@/backend/payment/payment.query";
import { useUsageStats } from "@/backend/stats/stats.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatIsoDateString } from "@/utils/dateTime";

export default function BillingPage() {
  const [activeOrderData, setActiveOrderData] = useState(null);
  const [latestOrderData, setLatestOrderData] = useState(null);
  const {
    data: subscription,
    isPending,
    refetch: subscriptionPending,
    isRefetching: subscriptionRefetching,
  } = useSubscription();
  const {
    data: orders,
    refetch: refreshOrders,
    isRefetching: isRefetchOrders,
  } = useUserOrgOrders();

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">
          Manage your subscription plan and payment methods
        </p>
      </div>
      <Card className="p-6 shadow-sm border-gray-200 bg-gradient-to-br from-white to-blue-50/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3>{subscription?.basePlan?.displayName}</h3>
              {latestOrderData?.subscriptionStatus === "authenticated" && (
                <Badge variant="outline" className="text-red-500">
                  ( Trial Period )
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              $99/month • Billed monthly • Next billing:{" "}
              {formatIsoDateString(activeOrderData?.subscriptionChargeAt)}
            </p>
          </div>
          <Button className="bg-gradient-to-r from-rateup-blue to-rateup-blue">
            Upgrade Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-5 border-2 rounded-xl bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:shadow-md transition-shadow">
            <p className="text-3xl text-rateup-blue ">10,000</p>
            <p className="text-sm text-muted-foreground">Messages/month</p>
          </div>
          <div className="text-center p-5 border-2 rounded-xl bg-gradient-to-br from-orange-50 to-white border-orange-200 hover:shadow-md transition-shadow">
            <p className="text-3xl text-rateup-orange ">5</p>
            <p className="text-sm text-muted-foreground">Team members</p>
          </div>
          <div className="text-center p-5 border-2 rounded-xl bg-gradient-to-br from-green-50 to-white border-green-200 hover:shadow-md transition-shadow">
            <p className="text-3xl text-green-600 ">∞</p>
            <p className="text-sm text-muted-foreground">Automations</p>
          </div>
          <div className="text-center p-5 border-2 rounded-xl bg-gradient-to-br from-purple-50 to-white border-purple-200 hover:shadow-md transition-shadow">
            <p className="text-3xl text-purple-600 ">24/7</p>
            <p className="text-sm text-muted-foreground">Support</p>
          </div>
        </div>
      </Card>
      <UsageCard subscription={subscription} />
      <OrderHistory
        orders={orders?.data}
        refresh={refreshOrders}
        isRefetching={isRefetchOrders}
      />
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
