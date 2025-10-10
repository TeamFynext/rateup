"use client";

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
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconBrandInstagram,
  IconBrandWhatsappFilled,
  IconDotsVertical,
  IconForbid2,
  IconHandOff,
  IconMessageCheck,
  IconPencil,
  IconTicket,
  IconUserShare,
  IconWebhook,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  MessagePlatform,
  SubscriptionFeaturePathName,
  WaMessageAssignStatus,
} from "@/types/enums";
import { useSetIsChatDisplayOpen } from "@/app/dashboard/inbox/ChatDisplayContext";
import useContactStore, { useContactsStore } from "@/app/dashboard/inbox/store";
import { useEditContactMutation } from "@/backend/campaign/contacts/contacts.query";
import { useGetChatbotDetails } from "@/backend/chatbot/chatbot.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { ContactsWithLastMessage } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useAssignInboxToUer,
  useBlockWhatsAppUser,
  useGetAssignedUserForContact,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import CopyIcon from "@/components/Button/CopyIcon";
import { LifecycleSelector } from "@/components/Contacts/LifecycleSelector";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { CreateTicketCard } from "@/components/Tickets/CreateTicketModal";
import { useChatbotStore } from "@/store/chatbot.store";
import { TicketType } from "@/utils/enums/ticket";
import { hasFeature } from "@/utils/subscription/subscription";
import { isInboxSessionExpired } from "@/utils/whatsapp/inbox";

import WaInboxCountdownTimer from "./countDown";
import classes from "./styles.module.css";

interface WaInboxChatDisplayHeaderProps {
  contact: ContactsWithLastMessage;
  smallScreen: boolean;
  waSettings: any;
}
export default function WaInboxChatDisplayHeader({
  contact,
  smallScreen,
  waSettings,
}: WaInboxChatDisplayHeaderProps) {
  const setIsChatDisplayOpen = useSetIsChatDisplayOpen();
  const editContactMutation = useEditContactMutation(null);
  const { setSelectedContact } = useContactsStore();
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

  const platform = contact?.source?.toUpperCase() || MessagePlatform.WHATSAPP;
  const isInsta = platform === MessagePlatform.INSTAGRAM;
  let leftSectionIcon: React.ReactNode;

  switch (platform) {
    case MessagePlatform.INSTAGRAM:
      leftSectionIcon = <InstagramIcon size={13} />;
      break;
    case MessagePlatform.WEBCHAT:
      leftSectionIcon = <IconWebhook size={13} color="#25D366" />;
      break;
    case MessagePlatform.WHATSAPP:
    default:
      leftSectionIcon = <IconBrandWhatsappFilled size={13} color="#25D366" />;
      break;
  }

  function getMessageSourceName(sourceIdentifier) {
    if (!waSettings) return sourceIdentifier;
    const settings = waSettings?.find(
      (setting) =>
        sourceIdentifier === setting.ibaId ||
        sourceIdentifier === setting.phone ||
        `+${sourceIdentifier}` === setting.phone,
    );
    if (isInsta)
      return (settings?.igDisplayName ?? settings?.igUserName)
        ? `@${settings?.igUserName}`
        : sourceIdentifier;
    return settings?.phoneDisplayName || settings?.phone || sourceIdentifier;
  }

  if (!contact) return null;
  return (
    <div className={classes.wrapper}>
      <Group>
        {
          <ActionIcon
            variant="subtle"
            onClick={() => {
              setSelectedContact(null);
              setIsChatDisplayOpen(false);
            }}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
        }

        <Avatar
          color="var(--mantine-primary-color-6)"
          // size={!isMobile && !smallScreen ? 65 : 35}
          size={"md"}
          name={contact.name}
        />
        <Stack className={classes.name_phone_wrapper}>
          <Text className={classes.name} fw={600}>
            {contact.name ?? contact.whatsappUserName}
          </Text>
          {contact.consent ? (
            <CopyIcon value={contact.phone || contact?.other}>
              <Text className={classes.phone}>
                {contact.phone || contact?.other}
              </Text>
            </CopyIcon>
          ) : (
            <Badge
              leftSection={<IconHandOff size={"0.75rem"} />}
              size="xs"
              variant="outline"
            >
              Do Not Disturb
            </Badge>
          )}
        </Stack>
        <LifecycleSelector value={contact.lifecycleId} id={contact.id} />
      </Group>

      <Group gap={"sm"}>
        {contact?.lastMessage && (
          <Badge
            tt={"initial"}
            size="xs"
            radius={"sm"}
            p={1}
            variant="light"
            color={isInsta ? "#cc2960" : "#25D366"}
            leftSection={leftSectionIcon}
          >
            {getMessageSourceName(contact?.lastMessage?.sourceIdentifier)}
          </Badge>
        )}
        <Stack gap={"xs"} align="center">
          {!smallScreen && platform !== MessagePlatform.WEBCHAT && (
            <WaInboxCountdownTimer
              timeStamp={contact?.lastReceivedMessageTimeStamp}
            />
          )}
        </Stack>
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

const ChatContactMenu = ({ contact }) => {
  const { data: subscription } = useSubscription();

  const { setSelectedContact, filterData } = useContactStore();
  const hasTicketFeature = useMemo(
    () => hasFeature(subscription, SubscriptionFeaturePathName.Ticket),
    [subscription],
  );
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
  const assignMut = useAssignInboxToUer(contactId, filterData);
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

export const InstagramIcon = ({ size = "xs" }: { size?: string | number }) => {
  return (
    <ThemeIcon
      variant="gradient"
      size={size}
      gradient={{ from: "#f09433", to: "#bc1888", deg: 45 }}
    >
      <IconBrandInstagram />
    </ThemeIcon>
  );
};
