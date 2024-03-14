import {
  ActionIcon,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import React, { useEffect, useState } from "react";
import Heading from "../styled/Heading/Heading";
import { IconPlus, IconRefresh, IconSelector } from "@tabler/icons-react";
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
import { StatusFilterMenu } from "./StatusFIlterMenu";
import { useUser } from "../../context/UserContext";
import { UserRole } from "../../utils/enums";
import CreateTicketModal from "./CreateTicketModal";
import { TicketType } from "../../utils/enums/ticket";

const TicketsHome = () => {
  const [sort, setSort] = useState(true);
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
          <Tooltip label="Refresh data">
            <ActionIcon
              variant="light"
              ml="xs"
              mr="50px"
              mt="3px"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                refetch();
                notifications.show({
                  id: "data-reload",
                  color: "teal",
                  title: "Refreshing data",
                  loading: true,
                  message: "Hold.. your data is getting update...",
                  autoClose: 2000,
                });
              }}
            >
              <IconRefresh
                style={{ width: "90%", height: "90%" }}
                stroke={1.5}
              />
            </ActionIcon>
          </Tooltip>
          {user?.role === UserRole.SUPADM && (
            <RateupButtonPrimary
              rightIcon={<IconPlus />}
              title="Create Ticket"
              onClick={openTicketModal}
            />
          )}
        </Group>
        <Group>
          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={"Sort"}
            variant="subtle"
            rightIcon={<IconSelector size="1rem" />}
          />
          <Paper>
            <Group
              mx="xl"
              px="sm"
              py="7px"
              justify="space-between"
              style={{
                minWidth: "230px",
                borderRadius: "10px",
                border: "1px solid var(--light-grey-color-4)",
              }}
            >
              <Text size="sm">Status: </Text>
              <StatusFilterMenu
                filterParam={filterParam}
                setFilterParam={setFilterParam}
              />
            </Group>
          </Paper>
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
          />
        </Group>
      </Group>

      {filteredTickets?.length > 0 ? (
        <SurveyCardLayout>
          {filteredTickets
            ?.sort((a, b) =>
              sort
                ? new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                : new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
            )
            .map((ticket) => (
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
    </Stack>
  );
};

export default TicketsHome;
