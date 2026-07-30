import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getAuthorisationURLWithQueryParamsAndSetState } from "supertokens-auth-react/recipe/thirdparty";

import { GoogleIcon } from "../Button/GoogleIcon.tsx";
import { Button } from "../ui/button.tsx";

function GoogleSignInButton({ buttonText, className }: { buttonText: string; className?: string }) {
  const { t: translations } = useTranslation();
  async function googleSignInClicked() {
    try {
      const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
        thirdPartyId: "google",

        // This is where Google should redirect the user back after login or error.
        // This URL goes on the Google's dashboard as well.

        frontendRedirectURI: `${import.meta.env.VITE_FRONTEND_URL}/login/callback/google`,
      });

      /*
          Example value of authUrl: https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&include_granted_scopes=true&response_type=code&client_id=1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com&state=5a489996a28cafc83ddff&redirect_uri=https%3A%2F%2Fsupertokens.io%2Fdev%2Foauth%2Fredirect-to-app&flowName=GeneralOAuthFlow
          */

      // we redirect the user to google for auth.
      window.location.assign(authUrl);
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        toast.error(err.message, {
          id: "load-data",
        });
      } else {
        toast.error(translations("Oops! Something went wrong...") + err, {
          id: "load-data",
        });
      }
    }
  }

  return (
    <Button variant="outline" onClick={googleSignInClicked} className={`h-10 ${className}`}>
      <GoogleIcon />
      <span className="font-semibold text-xs">{buttonText}</span>
    </Button>
  );
}

export default GoogleSignInButton;
