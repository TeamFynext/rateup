import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
// import { signOut } from "supertokens-auth-react/recipe/session";
import Session from "supertokens-auth-react/recipe/session";

import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper
        shadow="xs"
        style={{
          maxWidth: "300px",
          position: "relative",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div style={{ position: "relative", height: "40px" }}>
          <LoadingOverlay visible />
        </div>
        <Text
          size="xl"
          style={{
            marginBottom: "10px",
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          {translations("Logging out...")}
        </Text>
      </Paper>
    </div>
  );
}
