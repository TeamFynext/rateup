import AuthForm from "../../../components/Form/AuthForm";
import { AuthMode } from "../../../utils/enums";

const VerifyEmail = () => {
  return <AuthForm mode={AuthMode.VERIFY} />;
};

export default VerifyEmail;
