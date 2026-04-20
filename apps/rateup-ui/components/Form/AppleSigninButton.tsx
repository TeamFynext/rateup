"use client";

import { IconBrandAppleFilled } from "@tabler/icons-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { getAuthorisationURLWithQueryParamsAndSetState } from "supertokens-auth-react/recipe/thirdparty";

import { Button } from "@/components/ui/button";

type AppleSignInButtonProps = {
  className?: string;
  buttonText: string;
};

export default function AppleSignInButton({
  buttonText,
  className,
}: AppleSignInButtonProps) {
  const translations = useExtracted();

  const handleAppleLogin = async () => {
    try {
      const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
        thirdPartyId: "apple",
        frontendRedirectURI: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/login/callback/apple`,
        redirectURIOnProviderDashboard: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/callback/apple`,
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
    <Button
      onClick={handleAppleLogin}
      className={`w-full h-8 ${className}`}
      variant="outline"
    >
      <IconBrandAppleFilled />
      <span className="font-semibold">{buttonText}</span>
    </Button>
  );
}
