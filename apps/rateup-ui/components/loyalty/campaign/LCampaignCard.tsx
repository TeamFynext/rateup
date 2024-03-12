import {
  ActionIcon,
  Box,
  Group,
  Menu,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useTimeSince } from "../../../hooks/timeSince";
import { useRouter } from "next/router";
import { LCampaignTypeBadge } from "./LCampaignTypeBadge";
import { IconDots, IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../Modal/ConfirmationModal";
import { useDeleteCampaignMutation } from "../../../backend/loyalty/campaign/loyaltyCampaign.query";

export function LCampaignCard({ campaign }) {
  const timeSince = useTimeSince(campaign.createdAt);
  const router = useRouter();
  return (
    <PaperLayout
      maw="300px"
      h="150px"
      style={{
        cursor: "pointer",
      }}
      onClick={() => router.push(`/dashboard/loyalty/campaign/${campaign.id}`)}
    >
      <Stack>
        <Group justify={"space-between"}>
          <Title order={3}>{campaign.name}</Title>
          <CardMenu>
            <LCampaignCardMenuItems campaignId={campaign.id} />
          </CardMenu>
        </Group>
        <LCampaignTypeBadge type={campaign.type} />
        <Text
          style={{
            alignSelf: "flex-end",
          }}
          fz="sm"
          c="dimmed"
        >
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
  const deleteMutation = useDeleteCampaignMutation();

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
        headerLabel="Are you sure you want to delete this loyalty campaign?"
        headerTitle="Delete Loyalty Campaign"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
