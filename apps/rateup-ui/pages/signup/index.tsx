import AuthForm from "../../components/Form/AuthForm";
import { AuthMode } from "../../utils/enums";
import { useRouter } from "next/router";
import LoginSignupLayout from "../../components/LoginSignupLayout";
import { useCheckSession } from "../../hooks/checkSession";

const Signup = () => {
  const router = useRouter();
  const { auth } = router.query;
  useCheckSession();
  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.SIGNUP} authType={auth} />
    </LoginSignupLayout>
  );
};

export default Signup;
