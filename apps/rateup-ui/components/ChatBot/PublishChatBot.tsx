"use client";

import { useEffect, useState } from "react";

import { Badge, Flex, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useCreateChatbot,
  useGetChatbotDetails,
  useUpdateChatbot,
} from "../../backend/chatbot/chatbot.query";
import { ChatbotPublicPageStatus } from "../../types/enums";
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
  const translations = useExtracted();
  const generateUrl = () => {
    toast.loading(translations("Hold on...Url is getting generated"), {
      id: "short-url",
    });
    createChatbotUrlMutate.mutate(null, {
      onSuccess: () => {
        toast.success(translations("Url generated Successfully"), {
          id: "short-url",
        });
      },
      onError: (error) => {
        toast.error(error?.message || translations("Error generating url"), {
          id: "short-url",
        });
      },
    });
  };

  const handleChatbotStatus = () => {
    const loadingMessage = isActive
      ? translations("Hold On..Deactivating public page")
      : translations("Hold On..Activating public page");
    const loadingTitle = isActive
      ? translations("Deactivating")
      : translations("Activating");
    toast.loading(loadingMessage, {
      id: "chatbot-page",
    });
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
          toast.success(
            isActive
              ? translations("Page Deactivated Succesfully")
              : translations("Page Activated Succesfully"),
            {
              id: "chatbot-page",
            },
          );
        },
        onError: (error) => {
          toast.error(error?.message || translations("something went wrong"), {
            id: "chatbot-page",
          });
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
                ? translations("Show public url")
                : createChatbotUrlMutate.isPending
                  ? translations("Generating..")
                  : translations("Generate Public Url")
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
                <Text>{translations("Current Status:")}</Text>
                <Badge color={isActive ? "green" : "red"}>
                  {chatbotDetails?.publicPageStatus}
                </Badge>
              </Group>
              <RateupButtonSecondary
                color={isActive ? "red" : "var(--tertiary-color)"}
                title={
                  isActive
                    ? translations("Deactivate")
                    : translations("Activate")
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
