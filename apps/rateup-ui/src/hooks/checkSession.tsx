import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";

export const useCheckSession = () => {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const searchParams = useSearch({ strict: false });
  const auth = searchParams.auth;
  const redirectTo = searchParams?.redirectToPath;
  const [doesSessionExist, setDoesSessionExist] = useState(false);
  const checkSession = useCallback(async () => {
    try {
      if (!pathname) return;
      if (auth === "google" || auth === "apple") return;
      const doesSessionExist = await Session.doesSessionExist();
      if (["/login", "/signup"].includes(pathname) && doesSessionExist) {
        navigate({
          to: redirectTo || "/dashboard",
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
