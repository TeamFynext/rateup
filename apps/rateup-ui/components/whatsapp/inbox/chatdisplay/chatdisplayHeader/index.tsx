import { useMemo } from "react";

import {
  ActionIcon,
  Avatar,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconArrowLeft, IconEdit, IconPlus } from "@tabler/icons-react";

import { SubscriptionFeaturePathName } from "@/types/enums";
import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { useGetChatbotDetails } from "@/backend/chatbot/chatbot.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useTickets } from "@/backend/tickets/tickets.query";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import EditContactModal from "@/components/Contacts/EditContactModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import CreateTicketModal from "@/components/Tickets/CreateTicketModal";
import useTranslations from "@/dictionaries/useTranslation";
import { useSetIsChatDisplayOpen } from "@/pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { TicketType } from "@/utils/enums/ticket";
import { hasFeature } from "@/utils/subscription/subscription";

import WaInboxCountdownTimer from "./countDown";
import classes from "./styles.module.css";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactsWithLastMessage;
}
export default function WaInboxChatDisplayHeader({
  contact,
}: WaInboxChatDisplayHeaderProps) {
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const [
    openedCreateTicket,
    { open: openCreateTicket, close: closeCreateTicket },
  ] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 1200px)");

  const { data: tickets } = useTickets();
  const { selectedTicket, setSelectedContact } = useContactStore();
  const editContactMutation = useEditContactMutation(null);
  const { data: chatbot } = useGetChatbotDetails();
  const { data: subscription } = useSubscription();

  const ticketCount = useMemo(() => {
    return tickets?.reduce((count, ticket) => {
      if (ticket.assignedToId === selectedTicket?.assignedToId) count += 1;
      return count;
    }, 0);
  }, [tickets, selectedTicket]);

  const hasAIFeature = useMemo(
    () => hasFeature(subscription, SubscriptionFeaturePathName.AI),
    [subscription],
  );

  function handleAiWaChat(e) {
    const checked = e.currentTarget.checked;
    editContactMutation.mutate(
      { contactId: contact.id, data: { aiWaChat: e.currentTarget.checked } },
      {
        onSuccess: () => {
          setSelectedContact({ ...contact, aiWaChat: checked });
        },
      },
    );
  }

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
          {hasAIFeature &&
            chatbot?.enableWaChat &&
            chatbot?.enableAllWaChat && (
              <Switch
                size="xs"
                label={"AI Chat"}
                mt={"xs"}
                checked={contact.aiWaChat}
                onChange={handleAiWaChat}
              />
            )}
        </Stack>
        <ContactEdit isMobile={isMobile} contact={contact} />
      </Group>
      <WaInboxCountdownTimer timeStamp={contact?.userInitiatedFinalTimeStamp} />
      <Stack gap={1}>
        <RateupButtonPrimary
          title="create ticket"
          rightIcon={<IconPlus />}
          onClick={openCreateTicket}
          size="xs"
          radius={"md"}
        />
        <Text
          size="xs"
          display={selectedTicket ? "block" : "none"}
          ta={"center"}
          c={"red"}
        >
          {ticketCount} ticket created
        </Text>
      </Stack>
      <CreateTicketModal
        closeTicketModal={closeCreateTicket}
        createTicketOpened={openedCreateTicket}
        type={TicketType.CUSTOM}
        selectedTeamId=""
      />
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
