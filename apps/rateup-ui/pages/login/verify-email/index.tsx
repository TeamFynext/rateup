import AuthForm from "../../../components/Form/AuthForm";
import LoginSignupLayout from "../../../components/LoginSignupLayout";
import { AuthMode } from "../../../utils/enums";

const VerifyEmail = () => {
  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.VERIFY} />
    </LoginSignupLayout>
  );
};

export default VerifyEmail;
