"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import SuperTokens from "supertokens-auth-react";
import Session from "supertokens-auth-react/recipe/session";

import useTranslations from "@/dictionaries/useTranslation";

export const TryRefreshComponent = () => {
  const router = useRouter();
  const [didError, setDidError] = useState(false);
  const { translations } = useTranslations();
  useEffect(() => {
    void Session.attemptRefreshingSession()
      .then((hasSession) => {
        if (hasSession) {
          router.refresh();
        } else {
          SuperTokens.redirectToAuth();
        }
      })
      .catch(() => {
        setDidError(true);
      });
  }, [router]);

  if (didError) {
    return (
      <div>{translations["Something went wrong, please reload the page"]}</div>
    );
  }

  return <div>{translations["Loading..."]}</div>;
};
