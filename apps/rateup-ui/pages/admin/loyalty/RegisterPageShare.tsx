import React from "react";

import { Stack, Text } from "@mantine/core";

import { useUserInfo } from "@/backend/user/user.query";
import { CopyLinkComponent } from "@/components/Survey/ShareSurvey/ShareSurvey";
import { FRONTEND_URL } from "@/utils/constants";

const RegisterPageShare = () => {
  const { data: user } = useUserInfo() as { data: { data: UserData } };

  const orgId = user?.data?.orgId;

  return (
    <Stack>
      <Text>Loylaty Customer Regsitration page link</Text>
      <CopyLinkComponent
        value={`${FRONTEND_URL}/public/loyalty/${orgId}/register`}
      />
    </Stack>
  );
};

export default RegisterPageShare;
