import { pageMetadata } from "@/lib/metadata";

import ResetPasswordForm from "../../../components/Form/ResetPasswordForm";
import LoginSignupLayout from "../../../components/LoginSignupLayout";
import { ResetSteps } from "../../../utils/enums";

export const metadata = pageMetadata["/login/reset-password"];

const ResetPassword = () => {
  return (
    <LoginSignupLayout>
      <ResetPasswordForm mode={ResetSteps.STEP_ONE} />
    </LoginSignupLayout>
  );
};

export default ResetPassword;
