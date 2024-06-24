import { Group, Loader, ScrollArea, Stack, Tabs, Title } from "@mantine/core";
import React, { useEffect, useState } from "react";
import Heading from "../styled/Heading/Heading";
import { IconPlus } from "@tabler/icons-react";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { notifications } from "@mantine/notifications";
import {
  useDeleteTicket,
  useTickets,
} from "../../backend/tickets/tickets.query";
import { SurveysPageError } from "../Survey/SurveysPage/SurveyPageError";
import { SurveyCardLayout } from "../Card/SurveyCard/SurveyCardLayout";
import NothingFound from "../NothingFound/NothingFound";
import { TicketCard } from "./TicketCard";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../Modal/ConfirmationModal";
import { TeamSelector } from "../input/TeamSelector";
import { useUser } from "../../context/UserContext";
import { UserRole } from "../../utils/enums";
import CreateTicketModal from "./CreateTicketModal";
import { TicketStatus, TicketType } from "../../utils/enums/ticket";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { docsPath } from "../../utils/constants";
import InfoButton from "../Button/InfoButton";
import RefreshButton from "../Button/RefreshButton";

const TicketsHome = () => {
  const [sortOption, setSortOption] = useState("deadline");
  const { user } = useUser();
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const {
    isLoading: ticketLoading,
    data: tickets,
    error,
    refetch,
  } = useTickets();
  const [deleteTicketId, setDeleteTicketId] = useState("");
  const deleteTicket = useDeleteTicket();
  const [opened, { open: toggleDelete, close }] = useDisclosure(false);
  const [filterParam, setFilterParam] = useState("all");
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [
    createTicketOpened,
    { open: openTicketModal, close: closeTicketModal },
  ] = useDisclosure(false);

  useEffect(() => {
    deleteTicketId && toggleDelete();
  }, [deleteTicketId]);

  useEffect(() => {
    !opened && setDeleteTicketId("");
  }, [opened]);

  useEffect(() => {
    const filtered = tickets?.filter((t) => {
      const statusMatches = filterParam === "all" || t?.status === filterParam;
      const teamMatches =
        selectedTeamId === "all" || t?.teamId === selectedTeamId;
      return statusMatches && teamMatches;
    });

    const uniqueFilteredTickets = Array.from(
      new Set(filtered?.map((ticket) => ticket?.id)),
    ).map((id) => filtered.find((ticket) => ticket?.id === id));

    setFilteredTickets(uniqueFilteredTickets);
  }, [tickets, filterParam, selectedTeamId]);

  if (ticketLoading) return <Loader type="bars" />;
  if (error || !Array.isArray(tickets)) {
    console.error(tickets, error);
    return <SurveysPageError refetch={refetch} />;
  }
  const TicketStatusValues = Object.values(TicketStatus) as string[];
  const sortOptions = [
    { value: "deadline", label: "Sort by Deadline" },
    { value: "latest", label: "Sort by Latest First" },
    { value: "old", label: "Sort by Old First" },
  ];
  const handleSortChange = (value) => setSortOption(value);

  return (
    <Stack>
      <ConfirmationModal
        forDeleteFunctionality
        deleteQuotion="All the associated comments & actions will be deleted"
        opened={opened}
        onClose={close}
        onConfirm={(e) => {
          notifications.show({
            id: "load-data",
            loading: true,
            title: "Deleting ticket",
            message: `Hold on, your Ticket is getting deleted...`,
            autoClose: false,
            withCloseButton: true,
          });

          deleteTicket.mutate(deleteTicketId, {
            onSettled: () => {
              setDeleteTicketId("");
            },
          });
        }}
        confirmLabel="Delete"
        headerLabel="Are you sure to delete this ticket?"
        headerTitle="Delete Ticket"
      />

      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        openTicketModal={openTicketModal}
        closeTicketModal={closeTicketModal}
        selectedTeamId={""}
        type={TicketType.CUSTOM}
      />

      <Group justify="space-between">
        <Group gap={"md"}>
          <Heading title="Tickets" titleprops={{ w: "fit-content" }} />
          <InfoButton docUrl={`${docsPath}/ticket`} />
          <RefreshButton queryKeys={["tickets"]} />
          {user?.role === UserRole.SUPADM && (
            <RateupButtonPrimary
              rightIcon={<IconPlus />}
              title="Create Ticket"
              onClick={openTicketModal}
            />
          )}
        </Group>
        <Group>
          <ContainedSelection
            allowDeselect={false}
            data={sortOptions}
            defaultValue={sortOptions[0].value}
            value={sortOption}
            onChange={handleSortChange}
            placeholder="Select Sort Option"
          />
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
          />
        </Group>
      </Group>

      <Tabs defaultValue="all" mt="sm">
        <Tabs.List>
          <Tabs.Tab value="all" onClick={() => setFilterParam("all")}>
            All
          </Tabs.Tab>
          {TicketStatusValues.map((status) => (
            <Tabs.Tab
              key={status}
              value={status}
              onClick={() => setFilterParam(status)}
            >
              {status}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="all">
          <TicketPanel
            filteredTickets={filteredTickets}
            setDeleteTicketId={setDeleteTicketId}
            sortOption={sortOption}
            filterParam={filterParam}
          />
        </Tabs.Panel>
        {TicketStatusValues.map((status) => (
          <Tabs.Panel value={status}>
            <TicketPanel
              filteredTickets={filteredTickets}
              setDeleteTicketId={setDeleteTicketId}
              sortOption={sortOption}
              filterParam={filterParam}
            />
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
};

function TicketPanel({
  filteredTickets,
  setDeleteTicketId,
  sortOption,
  filterParam,
}) {
  const sortedTickets = filteredTickets.sort((a, b) => {
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
  });

  return (
    <Stack>
      <Title order={3} mt="xl" ml="lg">
        {" "}
        {filterParam === "all" ? "All Tickets" : `Tickets - ${filterParam}`}
      </Title>
      <ScrollArea h={"64vh"}>
        {sortedTickets?.length > 0 ? (
          <SurveyCardLayout>
            {sortedTickets.map((ticket) => (
              <TicketCard
                setDeleteTicketId={setDeleteTicketId}
                key={ticket.id}
                ticket={ticket}
              />
            ))}
          </SurveyCardLayout>
        ) : (
          <Stack mt="xl">
            <NothingFound
              text={`No ${filterParam !== "all" ? ` "${filterParam}" ` : ""} Tickets Found`}
            />
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}

export default TicketsHome;
