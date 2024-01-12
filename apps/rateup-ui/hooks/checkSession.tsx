import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";

import Session from "supertokens-web-js/recipe/session";

export const useCheckSession = () => {
  const router = useRouter();
  const [doesSessionExist, setDoesSessionExist] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const doesSessionExist = await Session.doesSessionExist();
      if (
        doesSessionExist &&
        (router.asPath?.toLowerCase() === "/login" ||
          router.asPath?.toLowerCase() === "/signup")
      ) {
        router.push("/dashboard");
      }
      setDoesSessionExist(doesSessionExist);
    } catch (error) {
      setDoesSessionExist(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  return doesSessionExist;
};
