import AuthForm from "../../../components/Form/AuthForm";
import LoginSignupLayout from "../../../components/LoginSignupLayout";
import { AuthMode } from "../../../utils/enums";

const VerifyOtp = () => {
  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.VERIFY_PHONE_NO} />
    </LoginSignupLayout>
  );
};

export default VerifyOtp;
