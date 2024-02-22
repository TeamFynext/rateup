import {
  Button,
  Container,
  Paper,
  Stack,
  Title,
  Text,
  Loader,
  Skeleton,
  Center,
  Flex,
} from "@mantine/core";
import { useRouter } from "next/router";
import { showSuccessToast } from "../../utils/notifications";
import { useEffect, useState } from "react";
import { useCreateAuthToken } from "../../backend/org/org.query";
import { RateupButtonBlue } from "../../components/Button/RateupButtons";

export default function AuthCallBack() {
  const router = useRouter();
  const { code } = router.query;
  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");

  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();
  useEffect(() => {
    if (code) {
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
  }, [code]);

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
