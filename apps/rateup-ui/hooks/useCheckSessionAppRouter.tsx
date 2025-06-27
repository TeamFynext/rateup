"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Session from "supertokens-web-js/recipe/session";

export const useCheckSessionAppRouter = () => {
  const router = useRouter();
  const [doesSessionExist, setDoesSessionExist] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const sessionExists = await Session.doesSessionExist();
      const currentPath = window.location.pathname.toLowerCase();
      const query = window.location.search;

      if (
        !sessionExists &&
        currentPath === "/signup" &&
        query === "?auth=google"
      ) {
        router.push("/login");
      }

      if (
        sessionExists &&
        (currentPath === "/login" || currentPath === "/signup")
      ) {
        router.push("/dashboard");
      }

      setDoesSessionExist(sessionExists);
    } catch {
      setDoesSessionExist(false);
    }
  }, [router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return doesSessionExist;
};
