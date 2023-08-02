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
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCopy,
  IconMail,
  IconMessage,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import React from "react";

const ShareSurvey = ({ survey }) => {
  const { surveyId } = useRouter().query;

  console.log(survey, ">>>istan survey");
  return (
    <Stack>
      <Paper p="md" radius="md" shadow="lg" sx={{ minHeight: "200px" }}>
        <SimpleGrid cols={2} spacing="xl">
          {/* //-----------------web survey share url ----------------- */}
          {survey.type == "web" ? (
            <Stack sx={{ maxWidth: "450px" }} p="md">
              <Title order={4}>Share Survey</Title>

              <CopyLinkComponent
                value={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`}
              />
            </Stack>
          ) : (
            //-----whatsapp survey share url copy section ----------
            <Stack sx={{ maxWidth: "450px" }} p="md">
              <Title order={6}>Share via whatsapp</Title>

              <CopyLinkComponent
                value={"https://wa.me/9744520889?text="+survey.id}
              />
            </Stack>
          )}

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
};

const CopyLinkComponent = ({ value }) => {
  return (
    <Group spacing={"0px"}>
      <TextInput
        sx={{ flexGrow: 1, maxWidth: "600px" }}
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
    </Group>
  );
};

export default ShareSurvey;
