import { useEffect, useState } from "react";
import { useRouter } from "next/router";

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
import { useTranslations } from "next-intl";

import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";

import { RateupButtonBlue } from "../../components/Button/RateupButtons";
import { useCheckSession } from "../../hooks/checkSession";

export default function AuthCallBack() {
  const router = useRouter();
  const { code, error } = router.query;
  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");
  const translations = useTranslations();
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
