"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Button,
  Center,
  Container,
  Flex,
  Loader,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useExtracted } from "next-intl";

import { useCheckSession } from "@/hooks/checkSession";
import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RateupLoader from "@/components/Loaders/RateupLoader";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <AuthCallBackWithParams />
    </Suspense>
  );
}
function AuthCallBackWithParams() {
  const searchParams = useSearchParams();
  return <AuthCallBack searchParams={searchParams} />;
}
function AuthCallBack({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const router = useRouter();
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");
  const translations = useExtracted();
  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();
  const session = useCheckSession();

  useEffect(() => {
    if (!session) {
      router.push("/login");
    }
    setCallBackRoute(
      JSON.parse(localStorage?.getItem("google-callback-route")),
    );
    if (error) {
      router.push(callbackRoute);
    } else if (code) {
      mut.mutate(
        { code: code },
        {
          onSuccess: () => {
            setIsLoading(false);
            setCallBackRoute(
              JSON.parse(localStorage?.getItem("google-callback-route")),
            );
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
            <Title order={2}>
              {translations("Your accout has been synced with RateUp")}
            </Title>
            <Flex justify="center" mt={"xl"}>
              <RateupButtonBlue
                title={translations("Go Back")}
                onClick={() => {
                  router.push(callbackRoute);
                }}
              />
            </Flex>
          </Paper>
        )}
      </Flex>
    </>
  );
}
