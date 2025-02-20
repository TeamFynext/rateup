import { ActionIcon, Avatar, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";

import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import EditContactModal from "@/components/Contacts/EditContactModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import useTranslations from "@/dictionaries/useTranslation";
import { useSetIsChatDisplayOpen } from "@/pages/dashboard/whatsapp/inbox/ChatDisplayContext";

import WaInboxCountdownTimer from "./countDown";
import classes from "./styles.module.css";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatDisplayHeader({
  contact,
}: WaInboxChatDisplayHeaderProps) {
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const isMobile = useMediaQuery("(max-width: 1200px)");
  if (!contact) return null;

  return (
    <div className={classes.wrapper}>
      <Group>
        {isMobile && (
          <ActionIcon
            variant="subtle"
            onClick={() => {
              setIsChatDisplayOpen(false);
            }}
          >
            <IconArrowLeft size={!isMobile ? 28 : 20} />
          </ActionIcon>
        )}

        <Avatar
          color="var(--mantine-primary-color-6)"
          size={!isMobile ? 65 : 35}
          name={contact.name}
        />
        <Stack className={classes.name_phone_wrapper}>
          <Text className={classes.name} fw={600}>
            {contact.name}
          </Text>
          <Text className={classes.phone}>{contact.phone}</Text>
        </Stack>
        <ContactEdit isMobile={isMobile} contact={contact} />
      </Group>
      <WaInboxCountdownTimer timeStamp={contact?.userInitiatedFinalTimeStamp} />
    </div>
  );
}

export const ContactEdit = ({ isMobile, contact }) => {
  const [opened, { close, open }] = useDisclosure();
  const { translations } = useTranslations();
  return (
    <Stack>
      <ActionIcon onClick={open} variant="subtle">
        <IconEdit size={!isMobile ? 20 : 12} />
      </ActionIcon>
      <FormModalLayout
        opened={opened}
        title={translations["Edit Contact"]}
        onClose={close}
        centered
        noCustomHeader
      >
        <EditContactModal
          contact={contact}
          closeEditModal={close}
          groupId={null}
          tags={Object.values(contact.tags ?? {})}
        />
      </FormModalLayout>
    </Stack>
  );
};
