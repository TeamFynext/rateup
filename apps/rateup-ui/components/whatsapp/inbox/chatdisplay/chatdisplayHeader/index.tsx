import { useEffect, useMemo, useState } from "react";

import {
  ActionIcon,
  Avatar,
  Badge,
  Group,
  Menu,
  Radio,
  RadioGroup,
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
  IconDotsVertical,
  IconForbid2,
  IconHandOff,
  IconMessageCheck,
  IconPencil,
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
  useBlockWhatsAppUser,
  useGetAssignedUserForContact,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import EditContactModal from "@/components/Contacts/EditContactModal";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import CreateTicketModal, {
  CreateTicketCard,
} from "@/components/Tickets/CreateTicketModal";
import { useUser } from "@/context/UserContext";
import useTranslations from "@/dictionaries/useTranslation";
import { useSetIsChatDisplayOpen } from "@/pages/dashboard/whatsapp/inbox/ChatDisplayContext";
import useContactStore from "@/pages/dashboard/whatsapp/inbox/store";
import { useChatbotStore } from "@/store/chatbot.store";
import { UserRole } from "@/utils/enums";
import { TicketType } from "@/utils/enums/ticket";
import { hasFeature } from "@/utils/subscription/subscription";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox";

import WaInboxCountdownTimer from "./countDown";
import classes from "./styles.module.css";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactsWithLastMessage;
  smallScreen: boolean;
}
export default function WaInboxChatDisplayHeader({
  contact,
  smallScreen,
}: WaInboxChatDisplayHeaderProps) {
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const editContactMutation = useEditContactMutation(null);
  const { setSelectedContact } = useContactStore();
  const isMobile = useMediaQuery("(max-width: 1200px)");
  const { selectedChatbotId } = useChatbotStore();

  const { data: chatbot } = useGetChatbotDetails(selectedChatbotId);
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
  const display_phone_numbera = contact?.metadata?.display_phone_number || "";
  return (
    <div
      className={classes.wrapper}
      style={{
        ...(smallScreen ? { padding: 10 } : {}),
      }}
    >
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
          size={!isMobile && !smallScreen ? 65 : 35}
          name={contact.name}
        />
        <Stack className={classes.name_phone_wrapper}>
          <Text className={classes.name} fw={600}>
            {contact.name}
          </Text>
          {contact.whatsappUserName && (
            <Tooltip label={"WhatsApp User Name"}>
              <Text size="xs">{contact.whatsappUserName}</Text>
            </Tooltip>
          )}
          <Text className={classes.phone}>{contact.phone}</Text>
        </Stack>
      </Group>
      <Stack gap={"xs"} align="center">
        {!smallScreen && (
          <WaInboxCountdownTimer
            timeStamp={contact?.lastReceivedMessageTimeStamp}
          />
        )}
        {!contact.consent && (
          <Badge
            leftSection={<IconHandOff size={"0.75rem"} />}
            size="xs"
            variant="outline"
          >
            Do Not Disturb
          </Badge>
        )}
      </Stack>

      <Group gap={"sm"}>
        {display_phone_numbera && (
          <Badge variant="light" size="sm">
            {display_phone_numbera}
          </Badge>
        )}
        {hasAIFeature && chatbot?.enableWaChat && chatbot?.enableAllWaChat && (
          <Switch
            size="xs"
            label={"AI Chat"}
            checked={contact.aiWaChat}
            onChange={handleAiWaChat}
          />
        )}
        <ChatContactMenu contact={contact} />
      </Group>
    </div>
  );
}

export const ContactEdit = ({ contact, opened, close }) => {
  const { translations } = useTranslations();
  return (
    <Stack>
      <FormModalLayout
        opened={opened}
        title={translations["Edit Contact"]}
        onClose={close}
        centered
        noCustomHeader
        size="lg"
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

const ChatContactMenu = ({ contact }) => {
  const { data: subscription } = useSubscription();

  const { setSelectedContact, filterData } = useContactStore();
  const hasTicketFeature = useMemo(
    () => hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    [subscription],
  );
  const [openedEdit, { open: openEditContact, close: closeEditContact }] =
    useDisclosure(false);
  const [
    openedCreateTicket,
    { open: openCreateTicket, close: closeCreateTicket },
  ] = useDisclosure(false);
  const editContactMutation = useEditContactMutation(null);
  const blockmut = useBlockWhatsAppUser(filterData);
  const [openedAssign, { open: openAssign, close: closeAssign }] =
    useDisclosure(false);
  const [openedConfirmation, { open: openConfirm, close: closeConfirm }] =
    useDisclosure(false);
  function handleCloseChat() {
    editContactMutation.mutate(
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

  function handleBlock() {
    blockmut.mutate(
      { phoneNumbersList: [contact.phone] },
      {
        onSuccess: () => {
          setSelectedContact({
            ...contact,
            blockedOnWhatsApp: true,
          });
        },
      },
    );
  }

  return (
    <Menu shadow="xl" position="bottom-end">
      <Menu.Target>
        <IconDotsVertical />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconUserShare size={20} />}
          onClick={openAssign}
        >
          Assign Chat
        </Menu.Item>
        {contact?.waMessageAssignStatus !== WaMessageAssignStatus.CLOSED && (
          <Menu.Item
            leftSection={<IconMessageCheck size={20} />}
            onClick={handleCloseChat}
          >
            Close Chat
          </Menu.Item>
        )}
        <Menu.Divider />
        {hasTicketFeature && (
          <Menu.Item
            leftSection={<IconTicket size={20} />}
            onClick={openCreateTicket}
          >
            Create Ticket
          </Menu.Item>
        )}
        <Menu.Item
          leftSection={<IconPencil size={20} />}
          onClick={openEditContact}
        >
          Edit Contact
        </Menu.Item>
        {!isInboxSessionExpired(contact?.lastReceivedMessageTimeStamp) &&
          !contact?.blockedOnWhatsApp && (
            <Menu.Item
              leftSection={<IconForbid2 size={20} />}
              onClick={openConfirm}
            >
              Block contact
            </Menu.Item>
          )}
      </Menu.Dropdown>
      <AssignInbox
        contactId={contact.id}
        opened={openedAssign}
        close={closeAssign}
      />
      <CreateTicketCard
        close={closeCreateTicket}
        opened={openedCreateTicket}
        type={TicketType.CUSTOM}
        hasTicketFeature={hasTicketFeature}
      />
      <ContactEdit
        opened={openedEdit}
        close={closeEditContact}
        contact={contact}
      />
      <ConfirmationModal
        onClose={closeConfirm}
        headerTitle={`Block ${contact?.name ?? contact?.phone}`}
        confirmLabel="Block"
        opened={openedConfirmation}
        onConfirm={handleBlock}
        closeLabel="Cancel"
        deleteQuotion="The blocked user cannot message you and you cannot message the user"
        forDeleteFunctionality
        headerLabel="Are you sure to block this user?"
      />
    </Menu>
  );
};

export const AssignInbox = ({ contactId, opened, close }) => {
  const [memberChoice, setMemberChoice] = useState("manual");
  const { data: teamMembers, isLoading } = useTeamsMembersOfOrg();
  const { data: assignedUsers } = useGetAssignedUserForContact(contactId);
  const { filterData } = useContactStore();
  const assignMut = useAssignInboxToUer(filterData);
  const form = useForm({
    initialValues: {
      teamId: "",
      contactId,
      assignedUserIds: [],
    },
    validate: {
      teamId: isNotEmpty("required"),
      assignedUserIds: memberChoice === "manual" && isNotEmpty("required"),
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
    const values = { ...form.values };
    if (memberChoice === "all")
      values.assignedUserIds = members?.map((m) => m.value);
    assignMut.mutate(values, {
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
      <AssignInboxContent
        form={form}
        memberChoice={memberChoice}
        setMemberChoice={setMemberChoice}
        isLoading={isLoading}
        members={members}
      />
    </FormModalLayout>
  );
};

export const AssignInboxContent = ({
  form,
  memberChoice,
  setMemberChoice,
  isLoading,
  members,
}) => {
  return (
    <Stack>
      <TeamSelector label="Select Team" {...form.getInputProps("teamId")} />
      <RadioGroup value={memberChoice} onChange={setMemberChoice}>
        <Group>
          <Radio value={"all"} label={"All Members"} />
          <Radio value={"manual"} label={"Select Manually"} />
        </Group>
      </RadioGroup>
      {memberChoice === "manual" && (
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
            placeholder="click to select"
            searchable
          />
        </Skeleton>
      )}
    </Stack>
  );
};
