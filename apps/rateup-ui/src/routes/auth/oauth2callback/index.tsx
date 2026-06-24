import { useEffect, useState } from "react";

import { Flex, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";

import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";

export const Route = createFileRoute("/auth/oauth2callback/")({
  component: AuthCallBack,
});

function AuthCallBack() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const code = searchParams.code;
  const error = searchParams.error;
  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");

  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();

  useEffect(() => {
    setCallBackRoute(
      JSON.parse(localStorage?.getItem("google-callback-route")),
    );
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
