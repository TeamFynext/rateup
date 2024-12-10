import { useState } from "react";
import { useRouter } from "next/router";

import { Group, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { AutomatedReplyCardListSkeleton } from "@/components/animation/skeleton/wa/AutomatedReplyCardList.skeleton";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { TeamSelector } from "@/components/input/TeamSelector";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import SimpleModalLayout from "@/components/Modal/SimpleModalLayout";
import NothingFound from "@/components/NothingFound/NothingFound";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards";
import useTranslations from "@/dictionaries/useTranslation";

import { AutomatedReplyForm } from "./create";

export default function AutomatedRepliesPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const { translations } = useTranslations();
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Stack mih={"80dvh"}>
      <Group justify={"space-between"}>
        <Group>
          <Title>{translations["Automated Replies"]}</Title>
          <RateupButtonBlue
            title={translations["Create automated reply"]}
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={open}
          />
        </Group>
        <TeamSelector
          value={teamId}
          onChange={setTeamId}
          enableAll={true}
          allowDeselect={false}
        />
        <SimpleModalLayout
          opened={opened}
          onClose={close}
          title="create automated reply"
        >
          <AutomatedReplyForm close={close} />
        </SimpleModalLayout>
      </Group>
      <WaAutomationCardsList teamId={teamId} />
    </Stack>
  );
}

const WaAutomationCardsList = ({ teamId }) => {
  const { data, isPending, isError, refetch } = useAllWaAutomatedReplies();
  const { translations } = useTranslations();
  if (isPending) return <AutomatedReplyCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={refetch} />;

  const automaton =
    teamId === "all"
      ? data
      : data?.filter((automation) => automation.teamId === teamId);

  if (automaton?.length === 0)
    return <NothingFound text={translations["No Automated Replies Found"]} />;
  return <WaAutomationCards data={automaton} />;
};
