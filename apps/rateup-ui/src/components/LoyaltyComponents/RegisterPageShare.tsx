import { useTranslation } from "react-i18next";

import { useUserInfo } from "@/backend/user/user.query";
import { CopyLinkComponent } from "@/components/Survey/ShareSurvey/ShareSurvey.tsx";
import { FRONTEND_URL } from "@/utils/constants.ts";

const RegisterPageShare = () => {
  const { data: user } = useUserInfo() as { data: { data: UserData } };

  const orgId = user?.data?.orgId;

  const { t: translations } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-lg font-semibold text-foreground">
        {translations("Customer Registration page link")}
      </h4>
      <CopyLinkComponent value={`${FRONTEND_URL}/loyalty/${orgId}/register`} />
    </div>
  );
};

export default RegisterPageShare;
