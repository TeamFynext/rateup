"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Flex, Loader, Paper, Stack, Text, Title } from "@mantine/core";

import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";

export default function AuthCallBack() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");

  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();

  useEffect(() => {
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
  }, [code, error]);

  return (
    <>
      <Flex justify={"center"} align={"center"} mt={200}>
        {isLoading ? (
          <Stack justify="center" align="center">
            <Text> Please wait..</Text>
            <Loader />
          </Stack>
        ) : (
          <Paper withBorder p={"xl"} shadow="xl">
            <Title order={2}>Your accout has been synced with RateUp</Title>
            <Flex justify="center" mt={"xl"}>
              <RateupButtonBlue
                title="Go Back"
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
