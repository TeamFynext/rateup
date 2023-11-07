import ResetPasswordForm from "../../../components/Form/ResetPasswordForm";
import LoginSignupLayout from "../../../components/LoginSignupLayout";
import { ResetSteps } from "../../../utils/enums";

const ResetPassword = () => {
  return (
    <LoginSignupLayout>
      <ResetPasswordForm mode={ResetSteps.STEP_ONE} />
    </LoginSignupLayout>
  );
};

export default ResetPassword;
