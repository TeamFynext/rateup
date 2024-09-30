import React, { useEffect, useState } from "react";

import {
  Box,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Tabs,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useDeleteTicket,
  useTickets,
} from "../../backend/tickets/tickets.query";
import { useUser } from "../../context/UserContext";
import { docsPath } from "../../utils/constants";
import { UserRole } from "../../utils/enums";
import { TicketStatus, TicketType } from "../../utils/enums/ticket";
import InfoButton from "../Button/InfoButton";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import { SurveyCardLayout } from "../Card/SurveyCard/SurveyCardLayout";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../input/TeamSelector";
import ConfirmationModal from "../Modal/ConfirmationModal";
import NothingFound from "../NothingFound/NothingFound";
import Heading from "../styled/Heading/Heading";
import { SurveysPageError } from "../Survey/SurveysPage/SurveyPageError";
import CreateTicketModal from "./CreateTicketModal";
import { TicketCard } from "./TicketCard";
import styles from "./TicketsHome.module.css";

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
  const { translations } = useTranslations();
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
    { value: "deadline", label: translations["Sort by Deadline"] },
    { value: "latest", label: translations["Sort by Latest First"] },
    { value: "old", label: translations["Sort by Old First"] },
  ];
  const handleSortChange = (value) => setSortOption(value);

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
        openTicketModal={openTicketModal}
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
        <Group>
          <ContainedSelection
            allowDeselect={false}
            data={sortOptions}
            defaultValue={sortOptions[0].value}
            value={sortOption}
            onChange={handleSortChange}
            placeholder={translations["Select Sort Option"]}
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
            {translations["All"]}
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
      <ScrollArea className={styles["ticket-cards-scroll-area-div"]} h={"64vh"}>
        {sortedTickets?.length > 0 ? (
          <Box className="cards-grid-global-class">
            {sortedTickets.map((ticket) => (
              <TicketCard
                setDeleteTicketId={setDeleteTicketId}
                key={ticket.id}
                ticket={ticket}
              />
            ))}
          </Box>
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
