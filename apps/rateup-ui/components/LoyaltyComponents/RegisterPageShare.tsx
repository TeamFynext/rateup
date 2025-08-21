import React from "react";

import { Stack, Text, Title } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useUserInfo } from "@/backend/user/user.query";
import { CopyLinkComponent } from "@/components/Survey/ShareSurvey/ShareSurvey";
import { FRONTEND_URL } from "@/utils/constants";

const RegisterPageShare = () => {
  const { data: user } = useUserInfo() as { data: { data: UserData } };

  const orgId = user?.data?.orgId;

  const translations = useTranslations();

  return (
    <Stack>
      <Title order={4}>{translations("Customer Regsitration page link")}</Title>
      <CopyLinkComponent
        value={`${FRONTEND_URL}/public/loyalty/${orgId}/register`}
      />
    </Stack>
  );
};

export default RegisterPageShare;
