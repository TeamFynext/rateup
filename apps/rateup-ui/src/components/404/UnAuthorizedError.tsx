import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconUserShield } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <Stack justify="center" align="center" pt={"200px"}>
      <Group>
        <IconUserShield size={32} stroke={2} />
        <Title order={3}>Access Denied</Title>
      </Group>
      <Text c="dimmed" size="lg" ta="center" w={"50%"}>
        You don&apos;t have permission to access this page. Please contact your super admin if you
        believe this is an error, or return to the homepage.
      </Text>
      <Group justify="center">
        <Button
          size="md"
          onClick={() =>
            navigate({
              to: "/dashboard",
            })
          }
        >
          Go back to home page
        </Button>
        <Button
          size="md"
          variant="subtle"
          onClick={() =>
            navigate({
              to: "/logout",
            })
          }
        >
          Sign in with a different account
        </Button>
      </Group>
    </Stack>
  );
}

export default UnauthorizedPage;
