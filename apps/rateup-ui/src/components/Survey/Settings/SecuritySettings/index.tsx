import PremiumFeature from "@/components/Premium/PremiumFeature.tsx";

import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";
import ETESettings from "./ETESettings.tsx";
import PasswordSettings from "./PasswordSettings.tsx";
import styles from "./SecuritySettings.module.css";

function SecuritySettings({ survey, surveyId, enabledModules }) {
  return (
    <>
      {(enabledModules.includes("endtoendencryption") ||
        enabledModules.includes("password")) && (
        <PaperLayout
          className={`${styles["security-settings-div"]} section-div`}
        >
          <h2 className={"settings-section-heading"}>Security</h2>

          <PremiumFeature
            isSubscribed={enabledModules.includes("endtoendencryption")}
          >
            <ETESettings survey={survey} />
          </PremiumFeature>

          {enabledModules.includes("password") && (
            <PasswordSettings survey={survey} surveyId={surveyId} />
          )}
        </PaperLayout>
      )}
    </>
  );
}

export default SecuritySettings;
