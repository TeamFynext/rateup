import React, { useEffect, useMemo, useState } from "react";

import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Loader,
  Popover,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconDots, IconFilter, IconPlus } from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";

import { SurveyType } from "@/types/enums";
import { useSurveys } from "@/backend/surveys/surveys.query";
import { ITicket } from "@/backend/tickets/tickets";
import useTranslations from "@/dictionaries/useTranslation";

import {
  useDeleteTicket,
  useTickets,
  useUpdateTicketStatusMutation,
} from "../../backend/tickets/tickets.query";
import { useUser } from "../../context/UserContext";
import { docsPath } from "../../utils/constants";
import { UserRole } from "../../utils/enums";
import { TicketStatus, TicketType } from "../../utils/enums/ticket";
import InfoButton from "../Button/InfoButton";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import ConfirmationModal from "../Modal/ConfirmationModal";
import Heading from "../styled/Heading/Heading";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { SurveysPageError } from "../Survey/SurveysPage/SurveyPageError";
import CreateTicketModal from "./CreateTicketModal";
import { TicketCard } from "./TicketCard";
import styles from "./TicketsHome.module.css";

const TicketsHome = () => {
  const { user } = useUser();
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const {
    isLoading: ticketLoading,
    data: tickets,
    error,
    refetch,
  } = useTickets();
  const [deleteTicketId, setDeleteTicketId] = useState("");
  const deleteTicket = useDeleteTicket();
  const [opened, { open: toggleDelete, close }] = useDisclosure(false);
  const [updateStatusData, setUpdateStatusData] = useState(null);
  const [allTickets, setAllTickets] = useState<Record<string, ITicket[]>>(null);
  const [ticketType, setTicketType] = useState("All Tickets");
  const { data: surveys } = useSurveys(
    [TicketType.SURVEY_RESPONSE, TicketType.FLOW_RESPONSE].includes(
      ticketType as TicketType,
    ),
  ) as { data: Survey[] };
  const [survey, setSurvey] = useState("All");
  const [
    createTicketOpened,
    { open: openTicketModal, close: closeTicketModal },
  ] = useDisclosure(false);
  const { translations } = useTranslations();
  const updateTicketStatus = useUpdateTicketStatusMutation();
  useEffect(() => {
    deleteTicketId && toggleDelete();
  }, [deleteTicketId]);

  useEffect(() => {
    !opened && setDeleteTicketId("");
  }, [opened]);

  useEffect(() => {
    if (ticketType === "All Tickets") setSurvey("All");
    const filtered = tickets?.filter((t) => {
      const teamMatches =
        selectedTeamId === "all" || t?.teamId === selectedTeamId;
      const typeMatch = ticketType === "All Tickets" || t?.type === ticketType;
      const surveyMatch = survey === "All" || t?.surveyId === survey;
      return teamMatches && typeMatch && surveyMatch;
    });
    setAllTickets(Object.groupBy(filtered || [], (ticket) => ticket?.status));
  }, [selectedTeamId, ticketType, survey]);

  useEffect(() => {
    const currentTickets = Object.values(allTickets || {}).flatMap((ti) => ti);
    if (
      !tickets?.every((t) =>
        currentTickets?.find(
          (tic) => tic?.id === t.id && tic.status === t.status,
        ),
      ) ||
      !currentTickets?.every((t) => tickets?.find((tic) => tic?.id === t.id))
    )
      setAllTickets(Object.groupBy(tickets || [], (ticket) => ticket?.status));
  }, [tickets]);

  const TicketStatusValues = Object.values(TicketStatus) as string[];
  const sortOptions = [
    { value: "deadline", label: translations["Sort by Deadline"] },
    { value: "latest", label: translations["Sort by Latest First"] },
    { value: "old", label: translations["Sort by Old First"] },
  ];

  const ticketTypeData = ["All Tickets", ...Object.values(TicketType)];
  const surveyData = surveys
    ? [
        "All",
        ...surveys
          ?.filter(
            (s) =>
              s?.type ===
              (ticketType === TicketType.SURVEY_RESPONSE
                ? SurveyType.Web
                : SurveyType.WaFlow),
          )
          .map((s) => ({ value: s?.id, label: s?.title })),
      ]
    : [];

  const FilterMenu = () => {
    return (
      <Popover width={300} trapFocus position="bottom" withArrow shadow="md">
        <Popover.Target>
          <Button leftSection={<IconFilter />}>Filter</Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack>
            <ContainedSelection
              allowDeselect={false}
              data={ticketTypeData}
              defaultValue={ticketTypeData[0]}
              value={ticketType}
              onChange={setTicketType}
              placeholder={"Select Ticket Type"}
            />
            <ContainedSelection
              allowDeselect={false}
              data={surveyData}
              value={survey}
              onChange={setSurvey}
              placeholder={"Filter by Survey"}
              display={
                [TicketType.SURVEY_RESPONSE, TicketType.FLOW_RESPONSE].includes(
                  ticketType as TicketType,
                )
                  ? "block"
                  : "none"
              }
            />
            <TeamSelector
              value={selectedTeamId}
              onChange={(teamId) => setSelectedTeamId(teamId)}
              enableAll={true}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  };

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const selectedTicket = allTickets[source.droppableId].find(
      (t) => t?.id === draggableId,
    );
    selectedTicket.status = destination.droppableId;
    const updatedSourceTickets = allTickets[source.droppableId].filter(
      (t) => t?.id !== draggableId,
    );
    const updatedDestinationaTickets = allTickets[destination.droppableId]
      ? [...allTickets[destination.droppableId]]
      : [];
    updatedDestinationaTickets.splice(destination.index, 0, selectedTicket);
    setAllTickets((prev) => ({
      ...prev,
      [source.droppableId]: updatedSourceTickets,
      [destination.droppableId]: updatedDestinationaTickets,
    }));
    setUpdateStatusData({
      id: draggableId,
      status: destination.droppableId,
      role: user.role,
    });
  };

  useEffect(() => {
    if (updateStatusData)
      updateTicketStatus.mutate(updateStatusData, {
        onSuccess: () => setUpdateStatusData(null),
      });
  }, [updateStatusData]);

  if (ticketLoading) return <Loader type="bars" />;
  if (error || !Array.isArray(tickets)) {
    console.error(tickets, error);
    return <SurveysPageError refetch={refetch} />;
  }

  return (
    <Stack>
      <ConfirmationModal
        forDeleteFunctionality
        deleteQuotion={
          translations["All the associated comments & actions will be deleted"]
        }
        opened={opened}
        onClose={close}
        onConfirm={(e) => {
          notifications.show({
            id: "load-data",
            loading: true,
            title: translations["Deleting ticket"],
            message: translations["Hold on, your Ticket is getting deleted..."],
            autoClose: false,
            withCloseButton: true,
          });

          deleteTicket.mutate(deleteTicketId, {
            onSettled: () => {
              setDeleteTicketId("");
            },
          });
        }}
        confirmLabel={translations["Delete"]}
        headerLabel={translations["Are you sure to delete this ticket?"]}
        headerTitle={translations["Delete Ticket"]}
      />

      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        closeTicketModal={closeTicketModal}
        selectedTeamId={""}
        type={TicketType.CUSTOM}
      />

      <Group justify="space-between">
        <Group gap={"md"}>
          <Heading
            title={translations["Tickets"]}
            titleprops={{ w: "fit-content" }}
          />
          <InfoButton docUrl={`${docsPath}/ticket`} />
          <RefreshButton queryKeys={["tickets"]} />
          {user?.role === UserRole.SUPADM && (
            <RateupButtonPrimary
              rightIcon={<IconPlus />}
              title={translations["Create Ticket"]}
              onClick={openTicketModal}
            />
          )}
        </Group>
        <FilterMenu />
      </Group>

      <ScrollArea w={"100%"} scrollbars="x">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Flex gap={"md"} w={"100%"}>
            {TicketStatusValues.map((status) => (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{ height: "100%" }}
                  >
                    <TicketPanel
                      status={status}
                      tickets={allTickets?.[status]}
                      setDeleteTicketId={setDeleteTicketId}
                      sortOptions={sortOptions}
                      ticketTypeData={ticketTypeData}
                      surveyData={surveyData}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </Flex>
        </DragDropContext>
      </ScrollArea>
    </Stack>
  );
};

function sortTickets(a, b, sortOption) {
  if (sortOption === "deadline") {
    const statusOrder = {
      OPEN: 1,
      IN_PROGRESS: 1,
      RESOLVED: 2,
      CLOSED: 3,
    };
    // Sort by status first
    const statusOrderA = statusOrder[a.status] || 4;
    const statusOrderB = statusOrder[b.status] || 4;
    if (statusOrderA !== statusOrderB) {
      return statusOrderA - statusOrderB;
    }

    // For tickets with the same status, sort by deadline
    // If no deadline, consider it as the latest possible date
    const deadlineA = a.deadline
      ? new Date(a.deadline).getTime()
      : Number.MAX_SAFE_INTEGER;
    const deadlineB = b.deadline
      ? new Date(b.deadline).getTime()
      : Number.MAX_SAFE_INTEGER;

    // Sort by deadline within the same status category
    return deadlineA - deadlineB;
  } else if (sortOption === "old") {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  } else if (sortOption === "latest") {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
  return 0;
}

const TicketPanel = ({
  status,
  tickets,
  setDeleteTicketId,
  sortOptions,
  ticketTypeData,
  surveyData,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [ticketType, setTicketType] = useState("All Tickets");
  const [survey, setSurvey] = useState("All");
  const [sortOption, setSortOption] = useState(null);
  const { translations } = useTranslations();
  const FilterMenu = () => {
    return (
      <Popover width={300} trapFocus position="bottom" withArrow shadow="md">
        <Popover.Target>
          <ActionIcon variant="subtle">
            <IconDots color="var(--shade-of-blue)" />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack>
            <ContainedSelection
              allowDeselect={false}
              data={sortOptions}
              defaultValue={sortOptions[0].value}
              value={sortOption}
              onChange={setSortOption}
              placeholder={translations["Select Sort Option"]}
            />
            <ContainedSelection
              allowDeselect={false}
              data={ticketTypeData}
              defaultValue={ticketTypeData[0]}
              value={ticketType}
              onChange={setTicketType}
              placeholder={"Select Ticket Type"}
            />
            <ContainedSelection
              allowDeselect={false}
              data={surveyData}
              value={survey}
              onChange={setSurvey}
              placeholder={"Filter by Survey"}
              display={
                [TicketType.SURVEY_RESPONSE, TicketType.FLOW_RESPONSE].includes(
                  ticketType as TicketType,
                )
                  ? "block"
                  : "none"
              }
              nothingFoundMessage={"Nothing found"}
            />
            <TeamSelector
              value={selectedTeamId}
              onChange={(teamId) => setSelectedTeamId(teamId)}
              enableAll={true}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  };

  const filteredTickets = useMemo(() => {
    if (ticketType === "All Tickets" && survey !== "All") setSurvey("All");
    return tickets
      ?.filter((t) => {
        const teamMatches =
          selectedTeamId === "all" || t?.teamId === selectedTeamId;
        const typeMatch =
          ticketType === "All Tickets" || t?.type === ticketType;
        const surveyMatch = survey === "All" || t?.surveyId === survey;
        return teamMatches && typeMatch && surveyMatch;
      })
      .sort((a, b) => sortTickets(a, b, sortOption));
  }, [tickets, selectedTeamId, ticketType, survey, sortOption]);

  return (
    <PaperLayout bg={"var(--shade-of-blue-1)"} h="100%" p={0} w={330}>
      <Stack bg={"var(--shade-of-blue-10)"} p="xs" mb={"xs"}>
        <Group justify="space-between">
          <Text fw={500} c="var(--shade-of-blue)">
            {status}
          </Text>
          <FilterMenu />
        </Group>
      </Stack>
      {filteredTickets?.length > 0 ? (
        <ScrollAreaAutosize mah="75vh">
          <Stack gap={"xs"} px={"xs"} mb={"xs"} h="100%">
            {filteredTickets?.map((ticket, index) => (
              <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TicketCard
                      setDeleteTicketId={setDeleteTicketId}
                      key={ticket.id}
                      ticket={ticket}
                    />
                  </div>
                )}
              </Draggable>
            ))}
          </Stack>
        </ScrollAreaAutosize>
      ) : (
        <Text c="dimmed" size="sm" p={"xs"}>
          No Tickets Found
        </Text>
      )}
    </PaperLayout>
  );
};

export default TicketsHome;
