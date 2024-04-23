import { useEffect, useState } from "react";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { Badge, Flex, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../utils/notifications";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from "@tabler/icons-react";
import { CopyLinkComponent } from "../Survey/ShareSurvey/ShareSurvey";
import { ChatbotPublicPageStatus } from "../../types/enums";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateChatbot,
  useGetChatbotDetails,
  useUpdateChatbot,
} from "../../backend/chatbot/chatbot.query";

const PublishChatbot = () => {
  const [chatbotPublicUrl, setChatbotPublicUrl] = useState("");
  const createChatbotUrlMutate = useCreateChatbot();
  const { data: chatbotDetails } = useGetChatbotDetails();
  const updateChatbotMutate = useUpdateChatbot();
  const [opened, { toggle }] = useDisclosure(false);
  const [isActive, setIsActive] = useState(false);
  const queryClient = useQueryClient();

  const generateUrl = () => {
    showLoadingToast(
      "Hold on...Url is getting generated",
      "short-url",
      true,
      "Generating",
    );
    createChatbotUrlMutate.mutate(null, {
      onSuccess: () => {
        showSuccessToast(
          "Url generated Successfully",
          "short-url",
          <IconCheck />,
          true,
        );
      },
      onError: () => {
        showErrorToast("Error generating url", "short-url", <IconX />, true);
      },
    });
  };

  const handleChatbotStatus = () => {
    const loadingMessage = isActive
      ? "Hold On..Deactivating public page"
      : "Hold On..Activating public page";
    const loadingTitle = isActive ? "Deactivating" : "Activating";
    showLoadingToast(loadingMessage, "chatbot-page", true, loadingTitle);
    updateChatbotMutate.mutate(
      {
        publicPageStatus: isActive
          ? ChatbotPublicPageStatus.INACTIVE
          : ChatbotPublicPageStatus.ACTIVE,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["chatbotPublicPageStatus", chatbotDetails?.shortUrlId],
          });
          showSuccessToast(
            isActive
              ? "Page Deactivated Succesfully"
              : "Page Activated Succesfully",
            "chatbot-page",
            <IconCheck />,
            true,
          );
        },
        onError: () => {
          showErrorToast(
            "something went wrong",
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
                ? "Show public url"
                : createChatbotUrlMutate.isPending
                  ? "Generating.."
                  : "Generate Public Url"
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
                <Text>Current Status:</Text>
                <Badge color={isActive ? "green" : "red"}>
                  {chatbotDetails?.publicPageStatus}
                </Badge>
              </Group>
              <RateupButtonSecondary
                color={isActive ? "red" : "var(--tertiary-color)"}
                title={isActive ? "Deactivate" : "Activate"}
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
