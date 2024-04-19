import { useEffect, useState } from "react";
import {
  useCreateOrgShortUrlMutation,
  useGetOrgShortUrl,
} from "../../backend/org/org.query";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { Flex, Stack } from "@mantine/core";
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

const PublishChatbot = () => {
  const [chatbotPublicUrl, setChatbotPublicUrl] = useState("");
  const createOrgUserShortUrlMutate = useCreateOrgShortUrlMutation();
  const { data } = useGetOrgShortUrl();
  const [opened, { toggle }] = useDisclosure(false);

  const generateUrl = () => {
    showLoadingToast(
      "Hold on...Url is getting generated",
      "short-url",
      true,
      "Generating",
    );
    createOrgUserShortUrlMutate.mutate(null, {
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

  useEffect(() => {
    if (data?.shortUrlId)
      setChatbotPublicUrl(
        `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/chatbot/${data?.shortUrlId}`,
      );
  }, [data]);
  return (
    <PaperLayout>
      <Stack justify="flex-start">
        <Flex justify={"flex-start"}>
          <RateupButtonSecondary
            title={
              data?.shortUrlId
                ? "Show public url"
                : createOrgUserShortUrlMutate.isPending
                  ? "Generating.."
                  : "Generate Public Url"
            }
            onClick={data?.shortUrlId ? toggle : generateUrl}
            rightIcon={
              data?.shortUrlId ? (
                !opened ? (
                  <IconChevronDown />
                ) : (
                  <IconChevronUp />
                )
              ) : null
            }
          />
        </Flex>
        {opened && <CopyLinkComponent value={chatbotPublicUrl} />}
      </Stack>
    </PaperLayout>
  );
};

export default PublishChatbot;
