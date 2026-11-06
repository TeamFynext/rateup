import { useTranslation } from "react-i18next";

import { useUserInfo } from "@/backend/user/user.query";

import { AuthShell } from "./AuthShell.tsx";
import { CheckInboxCard } from "./CheckInboxCard.tsx";

/**
 * Sits between signing up and the dashboard: the verification mail has already
 * been sent by signup, so this screen only names the address it went to and
 * offers to send another.
 */
function VerifyEmailPage({ sendEmail }: { sendEmail: () => void }) {
  const { t: translations } = useTranslation();
  const { data: userInfo } = useUserInfo();
  const email = userInfo && "data" in userInfo ? userInfo.data?.email : undefined;

  return (
    <AuthShell isSignup={true}>
      <CheckInboxCard
        title={translations("Check your inbox")}
        description={translations("We sent a verification link to")}
        email={email}
        expiryNote={translations("It works once and expires in 24 hours.")}
        onResend={sendEmail}
        backTo="/logout"
        backLabel={translations("Back to sign in")}
      />
    </AuthShell>
  );
}

export default VerifyEmailPage;
