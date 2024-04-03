import styles from "./SecuritySettings.module.css";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import ETESettings from "./ETESettings";
import PasswordSettings from "./PasswordSettings";

function SecuritySettings({ survey, surveyId, enabledModules }) {
  return (
    <PaperLayout className={`${styles["security-settings-div"]} section-div`}>
      <h2 className={"settings-section-heading"}>Security</h2>

      {enabledModules.includes("endtoendencryption") && (
        <ETESettings survey={survey} />
      )}

      {enabledModules.includes("password") && (
        <PasswordSettings survey={survey} surveyId={surveyId} />
      )}
    </PaperLayout>
  );
}

export default SecuritySettings;
