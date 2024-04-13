import { useRouter } from "next/router";
import {
  useDeleteWaAutomatedReplyMutation,
  useWaAutomatedReplies,
} from "../../../backend/whatsapp/automated-reply/automatedReply.query";
import { useTimeSince } from "../../../hooks/timeSince";
import { WaAutomatedReply } from "../../../types/global";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { Stack, Group, Title, Text, Menu, ActionIcon } from "@mantine/core";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../Modal/ConfirmationModal";

interface WaAutomationCardsProps {
  teamId: string;
}
export function WaAutomationCards({ teamId }: WaAutomationCardsProps) {
  const { data: automations } = useWaAutomatedReplies(teamId);

  console.log(automations);
  if (!automations || !Array.isArray(automations)) return null;

  return (
    <>
      {automations.map((automation) => (
        <AutomationCard key={automation.id} automation={automation} />
      ))}
    </>
  );
}

interface WaAutomationCardProps {
  automation: WaAutomatedReply;
}
function AutomationCard({ automation }: WaAutomationCardProps) {
  const timeSince = useTimeSince(automation.createdAt);
  const router = useRouter();
  return (
    <PaperLayout
      maw="300px"
      h="150px"
      style={{
        cursor: "pointer",
      }}
      onClick={() => router.push(`automated-replies/${automation.id}`)}
    >
      <Stack>
        <Group justify={"space-between"}>
          <Title order={3}>{automation.name}</Title>
          <CardMenu>
            <LCampaignCardMenuItems campaignId={automation.id} />
          </CardMenu>
        </Group>
        <Text fz="sm" c="dimmed">
          {`Created ${timeSince}`}
        </Text>
      </Stack>
    </PaperLayout>
  );
}

export function CardMenu({ children }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Menu>
        <Menu.Target>
          <ActionIcon variant="subtle">
            <IconDots />
          </ActionIcon>
        </Menu.Target>
        {children}
      </Menu>
    </div>
  );
}

function LCampaignCardMenuItems({ campaignId }) {
  const [deleteDialogOpened, { open, close }] = useDisclosure(false);
  const deleteMutation = useDeleteWaAutomatedReplyMutation();

  function handleDelete() {
    deleteMutation.mutate(campaignId, {
      onSuccess: close,
    });
  }

  return (
    <>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconTrash />} onClick={open}>
          Delete
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel="Are you sure you want to delete this Automated Reply?"
        headerTitle="Delete Automated Reply"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
