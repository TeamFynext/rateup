import { useEffect, useMemo } from "react";

import {
  ActionIcon,
  Avatar,
  Group,
  Skeleton,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconEdit,
  IconPlus,
  IconTicket,
  IconUserShare,
} from "@tabler/icons-react";

import {
  SubscriptionFeaturePathName,
  WaMessageAssignStatus,
} from "@/types/enums";
import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { useGetChatbotDetails } from "@/backend/chatbot/chatbot.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useTickets } from "@/backend/tickets/tickets.query";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useGetAssignedUserForContact,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import EditContactModal from "@/components/Contacts/EditContactModal";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import CreateTicketModal from "@/components/Tickets/CreateTicketModal";
import { useUser } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import { useSetIsChatDisplayOpen } from "@/pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { UserRole } from "@/utils/enums";
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
  const { setSelectedContact } = useContactStore();
  const { user } = useUser();
  const editContactMut = useEditContactMutation(null);
  const [
    openedCreateTicket,
    { open: openCreateTicket, close: closeCreateTicket },
  ] = useDisclosure(false);
  const [openedAssign, { open: openAssign, close: closeAssign }] =
    useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 1200px)");

  function handleCloseChat() {
    editContactMut.mutate(
      {
        contactId: contact.id,
        data: { waMessageAssignStatus: WaMessageAssignStatus.CLOSED },
      },
      {
        onSuccess: () => {
          setSelectedContact({
            ...contact,
            waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
          });
        },
      },
    );
  }
  const editContactMutation = useEditContactMutation(null);
  const { data: chatbot } = useGetChatbotDetails();
  const { data: subscription } = useSubscription();

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

      <Group gap={"lg"}>
        {user.role === UserRole.SUPADM && (
          <Group gap="xs">
            <Tooltip label={"Assign"}>
              <ActionIcon onClick={openAssign} variant="outline">
                <IconUserShare />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={"Create Ticket"}>
              <ActionIcon onClick={openCreateTicket}>
                <IconTicket />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
        {contact?.waMessageAssignStatus !== WaMessageAssignStatus.CLOSED && (
          <RateupButtonPrimary
            color="var(--grey-color-7)"
            title="Close Chat"
            radius={"md"}
            size="xs"
            onClick={handleCloseChat}
          />
        )}
      </Group>
      <CreateTicketModal
        closeTicketModal={closeCreateTicket}
        createTicketOpened={openedCreateTicket}
        type={TicketType.CUSTOM}
        selectedTeamId=""
      />
      <AssignInbox
        contactId={contact.id}
        opened={openedAssign}
        close={closeAssign}
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

export const AssignInbox = ({ contactId, opened, close }) => {
  const { data: teamMembers, isLoading } = useTeamsMembersOfOrg();
  const { data: assignedUsers } = useGetAssignedUserForContact(contactId);

  const assignMut = useAssignInboxToUer();
  const form = useForm({
    initialValues: {
      teamId: "",
      contactId,
      assignedUserIds: [],
    },
    validate: {
      teamId: isNotEmpty("required"),
      assignedUserIds: isNotEmpty("required"),
    },
  });
  const members = useMemo(
    () =>
      teamMembers &&
      teamMembers.data
        ?.filter((user) =>
          user.teams.some((t) => t.team_id === form.values.teamId),
        )
        .map((user) => ({ value: user.id, label: user.name })),
    [teamMembers, form.values.teamId],
  );

  function handleSubmit() {
    if (form.validate().hasErrors) return;
    assignMut.mutate(form.values, {
      onSettled: () => {
        onClose();
      },
    });
  }

  function onClose() {
    form.reset();
    close();
  }

  useEffect(() => {
    if (assignedUsers) {
      const data = {
        teamId: assignedUsers[0]?.teamId,
        contactId,
        assignedUserIds: assignedUsers?.map((user) => user.assignedUserId),
      };
      form.setInitialValues(data);
      form.setValues(data);
    }
  }, [assignedUsers]);

  return (
    <FormModalLayout
      title="Assign to Member"
      opened={opened}
      onClose={onClose}
      onSubmit={handleSubmit}
      isLoading={assignMut.isPending}
      buttonTitle="Assign"
      cancelOnClick={onClose}
      centered
      includeCancelButton
    >
      <Stack>
        <TeamSelector label="Select Team" {...form.getInputProps("teamId")} />
        <Skeleton visible={isLoading}>
          <ContainedMultiSelect
            data={members}
            styles={{
              label: {
                color:
                  "light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-4))",
                fontSize: 12,
              },
            }}
            {...form.getInputProps("assignedUserIds")}
            label={"Select Members"}
          />
        </Skeleton>
      </Stack>
    </FormModalLayout>
  );
};
