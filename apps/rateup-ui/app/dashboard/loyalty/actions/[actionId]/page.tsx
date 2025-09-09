"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { useTranslations } from "next-intl";

import { LoyaltyActionType } from "@/types/enums";
import {
  useGetLoyaltyActionById,
  useGetLoyaltyActions,
} from "@/backend/loyalty/actions/actions.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import LoyaltyActionForm from "@/components/LoyaltyComponents/Action/LoyaltyActionForm";
import { useRouteParams } from "@/context/RouteParamsContext";

const ActionID = () => {
  const params = useParams();
  const actionId = params?.actionId as string;

  const { update } = useRouteParams();
  const translations = useTranslations();

  const { data: action, isLoading: isActionLoading } = useGetLoyaltyActionById(
    actionId !== "create" ? actionId : null,
  );
  const { data: loyaltyActions, isLoading } = useGetLoyaltyActions(
    actionId === "create" || (action && !action?.action_id),
  );

  const existingActionIds = loyaltyActions
    ? loyaltyActions.filter((a) => a.action_id).map((a) => a.action_id)
    : [];
  const referralAction = loyaltyActions?.find(
    (a) => a.type === LoyaltyActionType.ReferralPurchase,
  );

  useEffect(() => {
    update({ actionId: action?.name });
  }, [action]);

  if (isActionLoading || isLoading) return <RateupLoader />;

  return (
    <LoyaltyActionForm
      title={action ? action.name : translations("Create Action")}
      action={action}
      existingActionIds={existingActionIds}
      isReferralAvailable={!referralAction}
    />
  );
};

export default ActionID;
