import { useEffect, useState } from "react";

import { Badge, Flex, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateChatbot,
  useGetChatbotDetails,
  useUpdateChatbot,
} from "../../backend/chatbot/chatbot.query";
import { ChatbotPublicPageStatus } from "../../types/enums";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../utils/notifications";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { CopyLinkComponent } from "../Survey/ShareSurvey/ShareSurvey";

const PublishChatbot = (selectedChatbotId) => {
  const [chatbotPublicUrl, setChatbotPublicUrl] = useState("");
  const createChatbotUrlMutate = useCreateChatbot();
  const { data: chatbotDetails } = useGetChatbotDetails(
    selectedChatbotId.selectedChatbotId,
  );
  const updateChatbotMutate = useUpdateChatbot();
  const [opened, { toggle }] = useDisclosure(false);
  const [isActive, setIsActive] = useState(false);
  const queryClient = useQueryClient();
  const { translations } = useTranslations();
  const generateUrl = () => {
    showLoadingToast(
      translations["Hold on...Url is getting generated"],
      "short-url",
      true,
      translations["Generating"],
    );
    createChatbotUrlMutate.mutate(null, {
      onSuccess: () => {
        showSuccessToast(
          translations["Url generated Successfully"],
          "short-url",
          <IconCheck />,
          true,
        );
      },
      onError: () => {
        showErrorToast(
          translations["Error generating url"],
          "short-url",
          <IconX />,
          true,
        );
      },
    });
  };

  const handleChatbotStatus = () => {
    const loadingMessage = isActive
      ? translations["Hold On..Deactivating public page"]
      : translations["Hold On..Activating public page"];
    const loadingTitle = isActive
      ? translations["Deactivating"]
      : translations["Activating"];
    showLoadingToast(loadingMessage, "chatbot-page", true, loadingTitle);
    updateChatbotMutate.mutate(
      {
        chatbotId: selectedChatbotId.selectedChatbotId,
        data: {
          publicPageStatus: isActive
            ? ChatbotPublicPageStatus.INACTIVE
            : ChatbotPublicPageStatus.ACTIVE,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["chatbotPublicPageStatus", chatbotDetails?.shortUrlId],
          });
          showSuccessToast(
            isActive
              ? translations["Page Deactivated Succesfully"]
              : translations["Page Activated Succesfully"],
            "chatbot-page",
            <IconCheck />,
            true,
          );
        },
        onError: () => {
          showErrorToast(
            translations["something went wrong"],
            "chatbot-page",
            <IconX />,
            true,
          );
        },
      },
    );
  };
  useEffect(() => {
    if (chatbotDetails?.shortUrlId)
      setChatbotPublicUrl(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/chatbot/${chatbotDetails?.shortUrlId}`,
      );
    if (chatbotDetails?.publicPageStatus) {
      setIsActive(
        chatbotDetails?.publicPageStatus === ChatbotPublicPageStatus.ACTIVE
          ? true
          : false,
      );
    }
  }, [chatbotDetails]);
  return (
    <PaperLayout>
      <Stack justify="flex-start">
        <Flex justify={"space-between"}>
          <RateupButtonSecondary
            title={
              chatbotDetails?.shortUrlId
                ? translations["Show public url"]
                : createChatbotUrlMutate.isPending
                  ? translations["Generating.."]
                  : translations["Generate Public Url"]
            }
            onClick={chatbotDetails?.shortUrlId ? toggle : generateUrl}
            rightIcon={
              chatbotDetails?.shortUrlId ? (
                !opened ? (
                  <IconChevronDown />
                ) : (
                  <IconChevronUp />
                )
              ) : null
            }
          />
          {chatbotDetails ? (
            <>
              <Group>
                <Text>{translations["Current Status:"]}</Text>
                <Badge color={isActive ? "green" : "red"}>
                  {chatbotDetails?.publicPageStatus}
                </Badge>
              </Group>
              <RateupButtonSecondary
                color={isActive ? "red" : "var(--tertiary-color)"}
                title={
                  isActive
                    ? translations["Deactivate"]
                    : translations["Activate"]
                }
                onClick={handleChatbotStatus}
              />
            </>
          ) : null}
        </Flex>
        {opened && <CopyLinkComponent value={chatbotPublicUrl} />}
      </Stack>
    </PaperLayout>
  );
};

export default PublishChatbot;
