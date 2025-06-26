import React from "react";
import { useRouter } from "next/router";

import {
  Button,
  Center,
  Group,
  Image,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconUserOff, IconUserShield } from "@tabler/icons-react";

export function UnauthorizedPage() {
  const router = useRouter();
  return (
    <Stack justify="center" align="center" pt={"200px"}>
      <Group>
        <IconUserShield size={32} stroke={2} />
        <Title order={3}>Access Denied</Title>
      </Group>
      <Text c="dimmed" size="lg" ta={"center"} w={"50%"}>
        You don't have permission to access this page. Please contact your super
        admin if you believe this is an error, or return to the homepage.
      </Text>
      <Group justify="center">
        <Button size="md" onClick={() => router.push("/dashboard")}>
          Go back to home page
        </Button>
        <Button
          size="md"
          variant="subtle"
          onClick={() => router.push("/logout")}
        >
          Sign in with a different account
        </Button>
      </Group>
    </Stack>
  );
}

export default UnauthorizedPage;
