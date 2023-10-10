import {
  Flex,
  useMantineTheme,
  Box,
  Button,
  Group,
  Text,
  ActionIcon,
  Center,
  Avatar,
  TextInput,
  Stack,
} from "@mantine/core";
import dayjs from "dayjs";
import { useState, useRef, useEffect } from "react";
import {
  ResponseComponent,
  SurveySendDetailComponent,
  SendSurveyComponent,
} from "../ChatComponents";
import { MainWindowHeader } from "./ChatHeader";
import { IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import RightPanelRoot from ".";
import CenteredSpinner from "../../Loaders/CenteredSpinner";
import classes from "./style.module.css";
import { updateWaCustomer } from "../../../backend/whatsapp/customer/waCustomer/waCustomer.api";
import { useDeleteWaCustomerFromWaCustomerGroupMutation } from "../../../backend/whatsapp/customer/waCustomerGroup/waCustomerGroup.query";
import { AddWaCustomersPanel } from "./AddWaCustomersModal";
import {
  useWaCustomerSurveySendHistory,
  useWaCustomerResponseHistory,
  useSendSurveyToWaCustomerMutation,
  useWaCustomerGroupsByWaCustomer,
  useDeleteWaCustomerMutation,
} from "../../../backend/whatsapp/customer/waCustomer/waCustomer.query";

export function IndividualMainWindow({ waCustomer, openImport }) {
  const { colors } = useMantineTheme();
  const [showDetails, { open, close }] = useDisclosure(false);

  if (!waCustomer)
    return (
      <AddWaCustomersPanel
        onClick={openImport}
        placeholder={"Add WaCustomer"}
      />
    );

  if (showDetails) {
    return <DetailsWindow waCustomer={waCustomer} onClose={close} />;
  } else {
    return <ChatWindow waCustomer={waCustomer} openDetails={open} />;
  }
}

function ChatWindow({ waCustomer, openDetails }) {
  const { colors } = useMantineTheme();
  const bottomRef = useRef(null);

  // TODO: BUG: below fetch not refetching immediately after mutation
  const {
    isLoading,
    error,
    data: waCustomerSurveySendHistory,
  } = useWaCustomerSurveySendHistory(waCustomer.id);
  const {
    isLoading: isResLoading,
    error: isResError,
    data: waCustomerResponseHistory,
  } = useWaCustomerResponseHistory(waCustomer.id);
  const sendSurveyMutation = useSendSurveyToWaCustomerMutation({
    waCustomerId: waCustomer.id,
  });

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (waCustomerResponseHistory && waCustomerSurveySendHistory) {
      scrollToBottom();
    }
  }, [waCustomerResponseHistory, waCustomerSurveySendHistory]);

  if (isLoading || isResLoading) {
    return (
      <RightPanelRoot>
        <CenteredSpinner />
      </RightPanelRoot>
    );
  }
  if (
    error ||
    !waCustomerSurveySendHistory ||
    isResError ||
    !waCustomerResponseHistory
  ) {
    console.log(error);
    return <div>Error</div>;
  }
  const timeline = [
    ...waCustomerResponseHistory.map((r) => ({ ...r, type: "response" })),
    ...waCustomerSurveySendHistory.map((r) => ({ ...r, type: "send" })),
  ].sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)));

  const sendHandler = (surveyId: string, templateId: string) => {
    sendSurveyMutation.mutate({ surveyId, templateId });
  };

  return (
    <Flex direction={"column"} style={{ height: "100%" }}>
      <MainWindowHeader
        title={waCustomer.name ? waCustomer.name : waCustomer.phone}
        onClick={openDetails}
      />
      <Box
        className={classes.chatBg}
        style={{
          flex: "1 1 0",
          backgroundColor: "white",
          overflowY: "scroll",
        }}
      >
        {timeline.map(({ type, survey, id, createdAt }, index) => {
          if (type === "response") {
            return (
              <ResponseComponent
                createdAt={createdAt}
                key={id}
                surveyTitle={survey.title}
              />
            );
          } else {
            return (
              <SurveySendDetailComponent
                key={id}
                name={survey.title}
                createdAt={createdAt}
              />
            );
          }
        })}
        <div ref={bottomRef}></div>
      </Box>
      <SendSurveyComponent sendHandler={sendHandler} />
    </Flex>
  );
}

function DetailsWindow({ waCustomer, onClose }) {
  const {
    isLoading,
    isError,
    data: groups,
  } = useWaCustomerGroupsByWaCustomer(waCustomer.id);
  const deleteFromGroupMutation =
    useDeleteWaCustomerFromWaCustomerGroupMutation();
  const deleteWaCustomerMutation = useDeleteWaCustomerMutation();

  if (isLoading) {
    return <CenteredSpinner />;
  }
  if (isError) return <div>Error</div>;

  return (
    <>
      <DetailsHeader
        title={waCustomer.name || waCustomer.phone}
        onClose={onClose}
      />
      <Box
        style={{
          flex: "1 1 0",
          overflowY: "scroll",
          backgroundColor: "whitesmoke",
        }}
      >
        <Stack
          gap={"sm"}
          py="sm"
          px="xs"
          className={classes.stackChildren}
          style={{
            // TODO: fix this. Styles are not being applied to children
            "& > *": {
              borderRadius: "8px",
            },
          }}
        >
          <Center
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "white",
            }}
            p="sm"
          >
            <Avatar size={"xl"} radius="xl" mb="sm" />
            <NameEditor
              name={waCustomer.name}
              onEdit={(name: string) =>
                updateWaCustomer(waCustomer.id, { name })
              }
            />
          </Center>
          <Flex
            direction={"column"}
            style={{ backgroundColor: "white" }}
            p="xs"
          >
            <Text fw={"bolder"} variant="heading" size="lg">
              Groups
            </Text>
            <Stack>
              {groups.length === 0 ? (
                <Text p="lg">No groups</Text>
              ) : (
                groups.map((g) => (
                  <Group justify="space-between" p="lg">
                    <Group>
                      <Avatar size={"md"} radius="lg " />
                      <Text>{g.name}</Text>
                    </Group>
                    <ActionIcon
                      color="red"
                      onClick={() => {
                        deleteFromGroupMutation.mutate({
                          waCustomerId: waCustomer.id,
                          rgroupId: g.id,
                        });
                      }}
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                ))
              )}
            </Stack>
          </Flex>
          <Button
            variant="subtle"
            color="red"
            radius={"xl"}
            // TODO: add confirmation modal
            onClick={() => deleteWaCustomerMutation.mutate(waCustomer.id)}
            leftSection={<IconTrash />}
          >
            Delete WaCustomer
          </Button>
        </Stack>
      </Box>
    </>
  );
}

export function NameEditor({ name, onEdit }) {
  const [editName, { open, close }] = useDisclosure(false);
  const [nameValue, setNameValue] = useState(name ? name : "");

  const handleEdit = () => {
    // TODO: create mutation?
    // Currently not invalidating query since we dont want to refetch all waCustomers just for a name change
    onEdit(nameValue);
    close();
  };

  if (editName) {
    return (
      <Group>
        <TextInput
          value={nameValue}
          onChange={(e) => setNameValue(e.currentTarget.value)}
        />
        <Button onClick={close}>Cancel</Button>
        <Button onClick={handleEdit}>Save</Button>
      </Group>
    );
  }

  return (
    <Group
      style={{
        position: "relative",
      }}
    >
      <Text px="lg">{nameValue ? nameValue : "Name_Not_Set"}</Text>
      <ActionIcon
        style={{
          position: "absolute",
          right: -30,
        }}
        onClick={open}
        variant="transparent"
        color="dark"
      >
        <IconPencil />
      </ActionIcon>
    </Group>
  );
}

export function DetailsHeader({ title, onClose }) {
  return (
    <Group className={classes.chatHeader} p={"lg"} mih={"75px"}>
      <ActionIcon
        className={classes.actionBtn}
        c="white"
        onClick={onClose}
        variant="subtle"
      >
        <IconX />
      </ActionIcon>
      <Text>{title}</Text>
    </Group>
  );
}
