import ResetPasswordForm from "../../../components/Form/ResetPasswordForm";
import { ResetSteps } from "../../../utils/enums";

const ResetPassword = () => {
  return <ResetPasswordForm mode={ResetSteps.STEP_ONE} />;
};

export default ResetPassword;
