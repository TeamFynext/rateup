import React from "react";
import {
  Paper,
  Text,
  Stack,
  Button,
  CopyButton,
  Group,
  TextInput,
  SimpleGrid,
  Title,
  ActionIcon,
  Modal,
  Flex,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
  IconMessage,
} from "@tabler/icons-react";
function ShareLandingPage({ LandingId }) {
  return (
    <Stack>
      <Paper p="md" radius="md" shadow="lg" sx={{ minHeight: "200px" }}>
        <SimpleGrid spacing="xl" cols={2}>
          {/* //-----------------web survey share url ----------------- */}

          <Stack p="md" dir="row">
            <Title order={4}>Share Survey</Title>

            <CopyLinkComponent
              value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/landing/${LandingId}`}
            />
          </Stack>

          {/* //-----------icons part-------------- */}

          <Stack sx={{ maxWidth: "400px" }} p="md">
            <Title order={4} align="center">
              How would you like to survey people?
            </Title>
            <Group position="center">
              <ActionIcon size="xl" variant="light">
                <IconMail size="2rem" />
              </ActionIcon>
              <ActionIcon size="xl" variant="light">
                <IconBrandWhatsapp size="2rem" />
              </ActionIcon>
              <ActionIcon size="xl" variant="light">
                <IconBrandFacebook size="2rem" />
              </ActionIcon>
              <ActionIcon size="xl" variant="light">
                <IconMessage size="2rem" />
              </ActionIcon>
            </Group>
          </Stack>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}

export default ShareLandingPage;

const CopyLinkComponent = ({ value }) => {
  return (
    <Flex style={{ flexDirection: "row", display: "flex", width: "100%" }}>
      <TextInput
        sx={{ minWidth: "70%" }}
        readOnly
        value={value}
        pr="sm"
      ></TextInput>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            color={copied ? "dark" : "yellow.6"}
            onClick={copy}
            rightIcon={<IconCopy />}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Flex>
  );
};
