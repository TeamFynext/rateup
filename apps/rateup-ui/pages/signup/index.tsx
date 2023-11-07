import { useDisclosure } from "@mantine/hooks";
import AuthForm from "../../components/Form/AuthForm";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";
import { LoadingOverlay } from "@mantine/core";
import { useRouter } from "next/router";
import LoginSignupLayout from "../../components/LoginSignupLayout";

const Signup = () => {
  const router = useRouter();
  const { auth } = router.query;

  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.SIGNUP} authType={auth} />
    </LoginSignupLayout>
  );
};

export default Signup;
