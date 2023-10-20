import {
  Stack,
  Button,
  CopyButton,
  Group,
  SimpleGrid,
  Title,
  ActionIcon,
  Switch,
  Paper,
  Box,
  Text,
  ScrollArea,
  Center,
} from "@mantine/core";
import {
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconCheck,
  IconChevronLeft,
  IconCopy,
  IconMail,
  IconPhonePause,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ShareQR from "./ShareQR";
import { updateSurvey } from "../../../backend/surveys/survey.api";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../Modal/FormModalLayout";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import { TabEnum } from "../../../pages/dashboard/surveys/[surveyId]";
import { StatusBadge } from "../SurveyCardList";

const ShareSurvey = ({ survey, setActiveTab }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const [shareUrl, setShareUrl] = useState("");

  const [isPublished, setIsPublished] = useState(survey?.isPublished);
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [errors, setErrors] = useState<Array<any> | { error: string } | null>(
    null,
  );

  useEffect(() => {
    if (!surveyId) return;
    if (survey.type === "whatsapp") {
      // TODO: get phone number from phone id (add phone number field)
      setShareUrl(
        `https://wa.me/7907137774?text=${encodeURIComponent(
          "/start " + survey.id,
        )}`,
      );
    } else {
      setShareUrl(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`,
      );
    }
  }, [surveyId]);

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(surveyId, data),
    onSuccess: (data) => {
      if (data?.data?.status === "failed") {
        setIsPublished(false);

        notifications.update({
          id: "load-data",
          color: "red",
          title: "Failed..!",
          loading: false,
          message: data?.data?.error
            ? data?.data?.error
            : "Your survey is incomplete",
          icon: <IconX size="1rem" />,
          autoClose: 3000,
        });
        setErrors(data?.data?.data);
        open();
      } else {
        data?.data?.action === "unpublish" && setIsPublished(false);
        data?.data?.action === "publish" && setIsPublished(true);

        notifications.update({
          id: "load-data",
          color: "teal",
          title: "Success",
          loading: false,
          message:
            data?.data?.action === "unpublish"
              ? "Survey Un-Published."
              : "Survey Published Successfully!",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
        queryClient.invalidateQueries(["surveys"]);
        queryClient.invalidateQueries(["survey", survey.id]);
      }
    },
  });

  const surveyStatusUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      notifications.show({
        id: "survey",
        message: "Survey status Updated!",
        autoClose: true,
      });
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["survey", survey.id]);
    },
  });

  function shareButtonAction(btn) {
    switch (btn) {
      case "fb":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`);
        break;
      case "mail":
        window.open(
          `mailto:?subject=Survey&body=Take minute to complete the survey: \n ${survey?.title} \n${shareUrl} \n\n`,
        );
        break;
      case "whatsapp":
        // TODO: add whatsapp share
        break;
      default:
        break;
    }
  }

  return (
    <Stack p={2}>
      <Paper
        radius="lg"
        p="30px"
        style={{
          boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
          overflowX: "auto",
        }}
      >
        <Group justify="space-between">
          <Switch
            size="lg"
            checked={isPublished}
            onChange={(event) => {
              notifications.show({
                id: "load-data",
                color: "teal",
                title: "Publishing",
                loading: true,
                message: "Please hold on while publishing your survey",
                autoClose: 3000,
              });
              surveyUpdateMutation.mutate({
                isPublished: event.currentTarget.checked,
              });
            }}
            label="Publish Survey"
            style={{
              root: {
                fontSize: "30px",
                fontWeight: "bold", //TODO : weight not working
              },
              label: { fontSize: "20px", fontWeight: "bold" },
            }}
          />
          <Group>
            <Text>Current Status: </Text>
            {isPublished ? (
              <StatusBadge active={survey?.active} />
            ) : (
              <Text c="dark.1"> Not published! </Text>
            )}
          </Group>
          <RateupButtonSecondary
            disabled={!isPublished}
            title={survey?.active ? "Pause" : "Resume"}
            leftIcon={survey?.active ? <IconPlayerPause /> : <IconPlayerPlay />}
            onClick={() =>
              surveyStatusUpdateMutation.mutate({ active: !survey?.active })
            }
          />
        </Group>
      </Paper>

      <FormModalLayout
        centered
        onClose={close}
        opened={opened}
        title="Survey contains errors"
      >
        <ScrollArea h={400} mb="xl">
          <Box my="xl">
            {Array.isArray(errors) ? (
              errors?.map((item, index) => (
                <Paper
                  radius="lg"
                  shadow="md"
                  key={item.id}
                  p="md"
                  style={{ marginBottom: "10px" }}
                >
                  <Title order={4}>
                    {Object.values(item.title)[0] as React.ReactNode}
                  </Title>
                  <ul>
                    {item.errors.map((error, index) => (
                      <li>
                        {" "}
                        <Text key={index} c="#fa5252">
                          {error}
                        </Text>{" "}
                      </li>
                    ))}
                  </ul>
                </Paper>
              ))
            ) : (
              <Box>
                <Text c="red">Error: {errors?.error}</Text>
              </Box>
            )}
          </Box>
        </ScrollArea>

        <Center>
          <RateupButtonBlue
            leftIcon={<IconChevronLeft />}
            title="Back to Edit Questions"
            onClick={() => {
              close();
              setActiveTab(TabEnum.Edit);
            }}
          />
        </Center>
      </FormModalLayout>
      <Stack>
        <PaperLayout p="md" radius="md" shadow="lg">
          <SimpleGrid cols={2} spacing="xl">
            <Stack style={{ maxWidth: "450px" }} p="md">
              <Title order={4}>Share Survey</Title>
              <CopyLinkComponent value={shareUrl} />
            </Stack>

            <Stack style={{ maxWidth: "400px" }} p="md">
              <Title order={4} style={{ textAlign: "center" }}>
                How would you like to survey people?
              </Title>
              <Group justify="center">
                <ActionIcon
                  size="xl"
                  variant="light"
                  onClick={() => shareButtonAction("mail")}
                >
                  <IconMail size="2rem" />
                </ActionIcon>
                <ActionIcon
                  size="xl"
                  variant="light"
                  onClick={() => shareButtonAction("whatsapp")}
                >
                  <IconBrandWhatsapp size="2rem" />
                </ActionIcon>
                <ActionIcon
                  size="xl"
                  variant="light"
                  onClick={() => shareButtonAction("fb")}
                >
                  <IconBrandFacebook size="2rem" />
                </ActionIcon>
              </Group>
            </Stack>
          </SimpleGrid>
        </PaperLayout>

        <ShareQR url={shareUrl} sx={{ borderRadius: "0.5rem" }} />
      </Stack>
    </Stack>
  );
};

interface CopyLinkComponentProps {
  value: string;
  disabled?: boolean;
  label?: string;
}
export const CopyLinkComponent = ({
  value,
  disabled = false,
  label = "",
}: CopyLinkComponentProps) => {
  return (
    <Group gap={"0px"} align="center">
      <ContainedTextField
        readOnly
        value={value}
        label={label}
        pr="sm"
        disabled={disabled}
        style={{
          maxWidth: "600px",
          flexGrow: 1,
        }}
      />
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            variant={copied ? "outline" : "filled"}
            onClick={copy}
            rightSection={<IconCopy />}
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
