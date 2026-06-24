import { Stack, Title } from "@mantine/core";
import React from "react";
import { useTranslation } from "react-i18next";

import { useUserInfo } from "@/backend/user/user.query";
import { CopyLinkComponent } from "@/components/Survey/ShareSurvey/ShareSurvey.tsx";
import { FRONTEND_URL } from "@/utils/constants.ts";

const RegisterPageShare = () => {
  const { data: user } = useUserInfo() as { data: { data: UserData } };

  const orgId = user?.data?.orgId;

  const { t: translations } = useTranslation();

  return (
    <Stack>
      <Title order={4}>{translations("Customer Registration page link")}</Title>
      <CopyLinkComponent value={`${FRONTEND_URL}/loyalty/${orgId}/register`} />
    </Stack>
  );
};

export default RegisterPageShare;
