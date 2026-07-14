import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
// import { signOut } from "supertokens-auth-react/recipe/session";
import Session from "supertokens-auth-react/recipe/session";

import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/auth/shopify/logout/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <Logout />
    </Suspense>
  );
}

function Logout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t: translations } = useTranslation();
  useEffect(() => {
    handleSignOut();
    navigate({
      to: "/login",
    });
  }, []);

  async function handleSignOut() {
    if (typeof window !== "undefined") {
      localStorage.clear();
      queryClient.clear();
    }
    await Session.signOut();

    navigate({
      to: "/login",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="relative max-w-75 p-5 text-center shadow-sm">
        <div className="relative flex h-10 items-center justify-center">
          <Spinner className="size-8" />
        </div>
        <p className="mt-2.5 mb-2.5 text-center text-xl">{translations("Logging out...")}</p>
      </Card>
    </div>
  );
}
