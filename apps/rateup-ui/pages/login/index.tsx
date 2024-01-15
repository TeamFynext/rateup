import AuthForm from "../../components/Form/AuthForm";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";
import LoginSignupLayout from "../../components/LoginSignupLayout";

const Login = () => {
  useCheckSession();

  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.LOGIN} />
    </LoginSignupLayout>
  );
};

export default Login;
