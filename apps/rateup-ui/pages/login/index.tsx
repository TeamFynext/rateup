import AuthForm from "../../components/Form/AuthForm";
import { AuthMode } from "../../utils/enums";

const Signup = () => {
  return <AuthForm mode={AuthMode.LOGIN} />;
};

export default Signup;
