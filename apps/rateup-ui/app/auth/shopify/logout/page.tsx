"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingOverlay, Paper, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
//import { signOut } from "supertokens-auth-react/recipe/session";
import Session from "supertokens-auth-react/recipe/session";

import RateupLoader from "@/components/Loaders/RateupLoader";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <Logout />
    </Suspense>
  );
}

const Logout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const translations = useTranslations();
  useEffect(() => {
    handleSignOut();
    router.push("/login");
  }, [router]);

  async function handleSignOut() {
    if (typeof window !== "undefined") {
      localStorage.clear();
      queryClient.clear();
    }
    await Session.signOut();

    router.push("/login");
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
          {translations("Logging out")}
        </Text>
      </Paper>
    </div>
  );
};
