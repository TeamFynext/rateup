import { useDisclosure } from "@mantine/hooks";
import AuthForm from "../../components/Form/AuthForm";
import { useCheckSession } from "../../hooks/checkSession";
import { AuthMode } from "../../utils/enums";
import { LoadingOverlay} from '@mantine/core';


const Login = () => {
  const isLoading = useCheckSession();
  const [visible, { toggle }] = useDisclosure(false);

  return (
    <>
      {isLoading ? <LoadingOverlay visible={visible} overlayBlur={2} /> : <AuthForm mode={AuthMode.LOGIN} />}
    </>
  );
};

export default Login;
