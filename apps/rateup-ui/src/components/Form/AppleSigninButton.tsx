import { IconBrandAppleFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getAuthorisationURLWithQueryParamsAndSetState } from "supertokens-auth-react/recipe/thirdparty";

import { Button } from "@/components/ui/button.tsx";

interface AppleSignInButtonProps {
  className?: string;
  buttonText: string;
}

export default function AppleSignInButton({ buttonText, className }: AppleSignInButtonProps) {
  const { t: translations } = useTranslation();

  const handleAppleLogin = async () => {
    try {
      const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
        thirdPartyId: "apple",
        frontendRedirectURI: `${import.meta.env.VITE_FRONTEND_URL}/login/callback/apple`,
        redirectURIOnProviderDashboard: `${import.meta.env.VITE_API_URL}/api/auth/callback/apple`,
      });
      window.location.assign(authUrl);
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        toast.error(err.message);
      } else {
        toast.error(translations("Oops! Something went wrong..."));
      }
    }
  };

  return (
    <Button onClick={handleAppleLogin} className={`h-10 ${className}`} variant="outline">
      <IconBrandAppleFilled />
      <span className="font-semibold text-xs">{buttonText}</span>
    </Button>
  );
}
