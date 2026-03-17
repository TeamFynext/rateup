"use client";

import React from "react";

import { Stack, Text, Title } from "@mantine/core";
import { useExtracted } from "next-intl";

import { useUserInfo } from "@/backend/user/user.query";
import { CopyLinkComponent } from "@/components/Survey/ShareSurvey/ShareSurvey";
import { FRONTEND_URL } from "@/utils/constants";

const RegisterPageShare = () => {
  const { data: user } = useUserInfo() as { data: { data: UserData } };

  const orgId = user?.data?.orgId;

  const translations = useExtracted();

  return (
    <Stack>
      <Title order={4}>{translations("Customer Registration page link")}</Title>
      <CopyLinkComponent value={`${FRONTEND_URL}/loyalty/${orgId}/register`} />
    </Stack>
  );
};

export default RegisterPageShare;
