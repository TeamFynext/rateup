import { pageMetadata } from "@/lib/metadata";

import ResetPasswordForm from "../../../../components/Form/ResetPasswordFormNew";
import { ResetSteps } from "../../../../utils/enums";

export const metadata = pageMetadata["/login/reset-password"];

const ResetPassword = () => {
  return <ResetPasswordForm mode={ResetSteps.STEP_ONE} />;
};

export default ResetPassword;
