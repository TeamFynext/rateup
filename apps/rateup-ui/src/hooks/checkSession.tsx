import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";

import { isEmailVerified, VERIFY_EMAIL_PATH } from "@/utils/auth/emailVerification.ts";

export const useCheckSession = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const searchParams = useSearch({ strict: false });
  const auth = searchParams.auth;
  const redirectTo =
    typeof searchParams?.redirectToPath === "string" ? searchParams.redirectToPath : undefined;
  const [doesSessionExist, setDoesSessionExist] = useState(false);
  const checkSession = useCallback(async () => {
    try {
      if (!pathname) return;
      if (auth === "google" || auth === "apple") return;
      const doesSessionExist = await Session.doesSessionExist();
      if (["/login", "/signup"].includes(pathname) && doesSessionExist) {
        // A session is not enough to enter the app. The API runs EmailVerification in
        // REQUIRED mode, so every guarded route 403s until the email is verified and
        // /dashboard bounces the visitor back here — where this hook used to send them
        // to /dashboard again, spinning between the two. The verify page is the only
        // page such a session can actually use.
        const verified = await isEmailVerified();
        navigate({
          to: verified ? redirectTo || "/dashboard" : VERIFY_EMAIL_PATH,
        });
      }
      setDoesSessionExist(doesSessionExist);
    } catch {
      setDoesSessionExist(false);
    }
  }, [pathname]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return doesSessionExist;
};
