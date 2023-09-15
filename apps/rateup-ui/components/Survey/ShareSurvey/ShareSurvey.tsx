import {
  Paper,
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
import React, { useState } from "react";
import ShareQR from "./ShareQR";

const ShareSurvey = ({ survey }) => {
  const { surveyId } = useRouter().query;

  const getSurveyUrl = (surveyId) => {
    return `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`

  }

  return (
    <Stack>
      <Paper p="md" radius="md" shadow="lg">
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
                // TODO: move phone number to env
                value={"https://wa.me/9744520889?text=" + survey.id}
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

      <ShareQR url={getSurveyUrl(surveyId)} sx={{ borderRadius: "0.5rem" }} />
    </Stack>
  );
};

interface CopyLinkComponentProps {
  value: string;
  disabled?: boolean;
  label?: string;
}
export const CopyLinkComponent = ({ value, disabled = false, label = "" }: CopyLinkComponentProps) => {
  return (
    <Group spacing={"0px"} align="end">
      <TextInput
        readOnly
        value={value}
        label={label}
        pr="sm"
        disabled={disabled}
        sx={{
          maxWidth: "600px",
          flexGrow: 1
        }}
      />
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            color={copied ? "dark" : "yellow.6"}
            onClick={copy}
            rightIcon={<IconCopy />}
            disabled={disabled}
          >
            {copied ? "Copied url" : "Copy url"}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
};

export default ShareSurvey;
