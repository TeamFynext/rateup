"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";

import { useLoyaltyApiSettings } from "@/backend/loyalty/apiSettings/apiSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";
import LoyaltyAPIForm from "@/components/LoyaltyComponents/API/LoyaltyAPIForm";

const APIID = () => {
  const params = useParams();
  const apiId = params?.apiId as string;

  const { getApiSetting } = useLoyaltyApiSettings(
    apiId === "create" ? "" : apiId,
  );

  const { data, isLoading, error, refetch, isRefetching } = getApiSetting;

  if (isLoading) return <RateupLoader />;
  if (error)
    return <ErrorComponent refetch={refetch} isRefetching={isRefetching} />;
  return <LoyaltyAPIForm apiInfo={data} />;
};

export default APIID;
