import { Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { AutomatedReplyCardListSkeleton } from "@/components/animation/skeleton/wa/AutomatedReplyCardList.skeleton";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import NothingFound from "@/components/NothingFound/NothingFound";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards";
import useTranslations from "@/dictionaries/useTranslation";

import { AutomatedReplyForm } from "./create";

export default function AutomatedRepliesPage() {
  const { translations } = useTranslations();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Stack mih={"80dvh"}>
      <Group justify={"space-between"}>
        <Group ml={"md"}>
          <RateupButtonBlue
            title={translations["Create automated reply"]}
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={open}
          />
        </Group>
        <SimpleModalLayout
          opened={opened}
          onClose={close}
          title="create automated reply"
        >
          <AutomatedReplyForm close={close} />
        </SimpleModalLayout>
      </Group>
      <WaAutomationCardsList />
    </Stack>
  );
}

const WaAutomationCardsList = () => {
  const { data, isPending, isError, refetch } = useAllWaAutomatedReplies();
  const { translations } = useTranslations();
  if (isPending) return <AutomatedReplyCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={refetch} />;

  if (data?.length === 0)
    return <NothingFound text={translations["No Automated Replies Found"]} />;
  return <WaAutomationCards data={data} />;
};
