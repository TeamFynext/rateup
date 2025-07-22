import { ReactNode } from "react";
import { useRouter } from "next/router";

import {
  ActionIcon,
  Badge,
  FloatingPosition,
  Group,
  Menu,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";

import { WaAutomatedReply } from "@/types/global";
import { useTimeSince } from "@/hooks/timeSince";
import { useDeleteWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import useTranslations from "@/dictionaries/useTranslation";

import classes from "./styles.module.css";

interface WaAutomationCardsProps {
  data: any;
}
export function WaAutomationCards({ data }: WaAutomationCardsProps) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <SimpleGrid
      p={"0.875rem"}
      spacing={"lg"}
      cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 4 }}
    >
      {data.map((automation) => (
        <AutomationCard key={automation.id} automation={automation} />
      ))}
    </SimpleGrid>
  );
}

interface WaAutomationCardProps {
  automation: WaAutomatedReply;
}
function AutomationCard({ automation }: WaAutomationCardProps) {
  const timeSince = useTimeSince(automation.createdAt);
  const router = useRouter();
  const { translations } = useTranslations();
  return (
    <PaperLayout
      p="md"
      shadow="lg"
      radius="lg"
      mih={"175px"}
      hoveractive={true}
      style={{
        cursor: "pointer",
      }}
      onClick={() => router.push(`automated-replies/${automation.id}`)}
    >
      <Stack className={classes.card_wrapper}>
        <Group justify={"space-between"}>
          <Title order={3}>{automation.name}</Title>
          <CardMenu>
            <LCampaignCardMenuItems campaignId={automation.id} />
          </CardMenu>
        </Group>
        <Group justify="space-between">
          <Text fz="sm" c="dimmed">
            {` ${translations["Created"]} ${timeSince}`}
          </Text>
          {automation?.commands?.includes("*") && (
            <Badge size="xs" color="green">
              Fallback
            </Badge>
          )}
        </Group>
        <Group className={classes.card_footer}>
          <Text fz={"xs"} fw={600}>
            {translations["For"]}
          </Text>

          {automation?.commands?.map((kw) => (
            <Badge size="xs" variant="outline" key={kw}>
              {kw}
            </Badge>
          )) ?? ""}
        </Group>
        <Group justify="space-between">
          <Badge
            variant="light"
            size="xs"
          >{`Type: ${automation.matchType}`}</Badge>
          <Switch
            checked={automation?.isEnabled}
            readOnly
            label={
              automation.isEnabled
                ? translations["Enabled"]
                : translations["Disabled"]
            }
            size="xs"
            styles={{
              label: {
                paddingLeft: 2,
              },
            }}
          />
        </Group>
      </Stack>
    </PaperLayout>
  );
}

export function CardMenu({
  children,
  position,
}: {
  children: ReactNode;
  position?: FloatingPosition;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Menu position={position ?? "bottom-start"}>
        <Menu.Target>
          <ActionIcon variant="subtle">
            <IconDots color="gray" />
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
  const { translations } = useTranslations();
  function handleDelete() {
    deleteMutation.mutate(campaignId, {
      onSuccess: close,
    });
  }

  return (
    <>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconTrash />} onClick={open}>
          {translations["Delete"]}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel={
          translations["Are you sure you want to delete this Automated Reply?"]
        }
        headerTitle={translations["Delete Automated Reply"]}
        confirmLabel={translations["Delete"]}
        onConfirm={handleDelete}
      />
    </>
  );
}
