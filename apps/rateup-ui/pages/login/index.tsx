import { useDisclosure } from "@mantine/hooks";
import AuthForm from "../../components/Form/AuthForm";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";
import { Center, Flex, LoadingOverlay } from "@mantine/core";
import LoginSignupLayout from "../../components/LoginSignupLayout";

const Login = () => {
  const doesSessionExist = useCheckSession();

  return (
    <LoginSignupLayout>
      <AuthForm mode={AuthMode.LOGIN} />
    </LoginSignupLayout>
  );
};

export default Login;
