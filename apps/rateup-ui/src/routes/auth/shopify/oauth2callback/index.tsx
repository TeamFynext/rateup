import { Flex, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";

export const Route = createFileRoute("/auth/shopify/oauth2callback/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <AuthCallBackWithParams />
    </Suspense>
  );
}

function AuthCallBackWithParams() {
  const searchParams = useSearch({ strict: false });
  return <AuthCallBack searchParams={searchParams} />;
}
function AuthCallBack({ searchParams }: { searchParams: Record<string, string> }) {
  const navigate = useNavigate();
  const code = searchParams.code;
  const error = searchParams.error;

  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");
  const { t: translations } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();
  const session = useCheckSession();

  useEffect(() => {
    if (!session) {
      navigate({
        to: "/login",
      });
    }
    setCallBackRoute(JSON.parse(localStorage?.getItem("google-callback-route")));
    if (error) {
      navigate({
        to: callbackRoute,
      });
    } else if (code) {
      mut.mutate(
        { code: code },
        {
          onSuccess: () => {
            setIsLoading(false);
            setCallBackRoute(JSON.parse(localStorage?.getItem("google-callback-route")));
          },
        },
      );
    }
  }, [code, error, session]);

  return (
    <>
      <Flex justify={"center"} align={"center"} mt={200}>
        {isLoading ? (
          <Stack justify="center" align="center">
            <Text> {translations("Please wait..")}</Text>
            <Loader />
          </Stack>
        ) : (
          <Paper withBorder p={"xl"} shadow="xl">
            <Title order={2}>{translations("Your accout has been synced with RateUp")}</Title>
            <Flex justify="center" mt={"xl"}>
              <RateupButtonBlue
                title={translations("Go Back")}
                onClick={() => {
                  navigate({
                    to: callbackRoute,
                  });
                }}
              />
            </Flex>
          </Paper>
        )}
      </Flex>
    </>
  );
}
