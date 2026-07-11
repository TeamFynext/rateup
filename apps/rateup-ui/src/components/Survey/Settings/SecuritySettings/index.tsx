import PremiumFeature from "@/components/Premium/PremiumFeature.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

import ETESettings from "./ETESettings.tsx";
import PasswordSettings from "./PasswordSettings.tsx";

function SecuritySettings({ survey, surveyId, enabledModules }) {
  if (!enabledModules.includes("endtoendencryption") && !enabledModules.includes("password")) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PremiumFeature isSubscribed={enabledModules.includes("endtoendencryption")}>
          <ETESettings survey={survey} />
        </PremiumFeature>

        {enabledModules.includes("password") && (
          <PasswordSettings survey={survey} surveyId={surveyId} />
        )}
      </CardContent>
    </Card>
  );
}

export default SecuritySettings;
