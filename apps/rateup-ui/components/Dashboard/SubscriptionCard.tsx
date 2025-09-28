"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@mantine/core";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

import { useSubscription } from "@/backend/subscription/subscription.query";

const SubscriptionCard = () => {
  const { data: subscription, isLoading } = useSubscription();
  const translations = useTranslations();
  const router = useRouter();

  if (isLoading || !subscription) {
    return (
      <div className="bg-white shadow rounded-lg p-6 w-full border border-[#E2E5ED] h-full animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 mb-4 rounded" />
        <div className="h-4 w-24 bg-gray-200 mb-2 rounded" />
        <div className="h-8 w-1/2 bg-gray-300 mb-4 rounded" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-3/4" />
          ))}
        </div>
        <div className="h-2 bg-gray-300 rounded-full mt-6" />
        <div className="h-10 bg-gray-200 mt-4 rounded w-full" />
      </div>
    );
  }

  const { basePlan, createdAt, expiresAt } = subscription;

  const daysRemaining = dayjs(expiresAt).diff(dayjs(), "day");

  return (
    <div className="bg-white shadow rounded-lg p-6 w-full border border-[#E2E5ED] h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {translations("Subscription") || "Subscription"}
        </h2>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full
         ${daysRemaining > 0 ? "bg-[#69F0AE] text-[#075E54]" : "bg-[#ff525284] text-[#D32F2F]"}`}
        >
          {daysRemaining > 0 ? translations("Active") : translations("Expired")}
        </span>
      </div>
      <div className="flex flex-col gap-6">
        <div className="text-sm text-gray-600 space-y-4 mb-6 flex flex-col gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase text-gray-400">
              {translations("Plan Name") || "Plan Name"}
            </p>
            <p className="text-4xl font-bold text-gray-800">
              {basePlan?.displayName}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              {translations("Start Date") || "Start Date"}
            </p>
            <p className="text-md text-gray-800 font-normal">
              {dayjs(createdAt).format("DD MMM YYYY")}
            </p>
          </div>
          {!subscription.basePlan?.name.includes("FREE") && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {translations("Renewal Date") || "Renewal Date"}
                </p>
                <p className="text-md text-gray-800 font-normal">
                  {dayjs(expiresAt).format("DD MMM YYYY")}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {translations("Days Remaining") || "Days Remaining"}
                </p>
                <p className="text-4xl font-bold text-gray-800">
                  {daysRemaining}
                </p>
              </div>
            </>
          )}
        </div>

        <div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-[#004F98] transition-all"
              style={{ width: `${(daysRemaining / 365) * 100}%` }}
            ></div>
          </div>

          <div className="w-full flex justify-center items-center">
            <Button
              onClick={() =>
                router.push("/dashboard/settings?tab=account&view=billing")
              }
            >
              <div className="text-white text-sm font-medium">
                {translations("Manage Subscription") || "Manage Subscription"}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
