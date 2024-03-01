import {
  ActionIcon,
  Box,
  Grid,
  Group,
  Loader,
  Stack,
  Tabs,
  Tooltip,
} from "@mantine/core";
import React, { useState } from "react";
import Heading from "../styled/Heading/Heading";
import { IconRefresh, IconSelector } from "@tabler/icons-react";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import { notifications } from "@mantine/notifications";
import { useTickets } from "../../backend/tickets/tickets.query";
import { SurveysPageError } from "../Survey/SurveysPage/SurveyPageError";
import { SurveyCardLayout } from "../Card/SurveyCard/SurveyCardLayout";
import NothingFound from "../NothingFound/NothingFound";
import { TicketCard } from "./TicketCard";
import StyledTabs from "../styled/StyledTabs/StyledTabs";
import styles from "../../components/Survey/SurveyId.module.css";
import { TicketStatus } from "../../utils/enums/ticket";

const TicketsHome = () => {
  const [sort, setSort] = useState(true);
  const [activeTab, setActiveTab] = useState<TicketStatus | null>(
    TicketStatus.OPEN,
  );
  const {
    isLoading: ticketLoading,
    data: tickets,
    error,
    refetch,
  } = useTickets();

  if (ticketLoading) return <Loader type="bars" />;
  if (error || !Array.isArray(tickets)) {
    console.error(tickets, error);
    return <SurveysPageError refetch={refetch} />;
  }

  return (
    <Stack>
      <StyledTabs
        value={activeTab}
        onChange={(tab) => setActiveTab(tab as TicketStatus)}
        className={styles["survey-tabs-and-panels-container"]}
      >
        <Grid columns={12} className={styles["title-tabs-container"]}>
          <Grid.Col span={3}>
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
            </Group>
          </Grid.Col>
          <Grid.Col span={6}>
            <Tabs.List>
              <Tabs.Tab value={TicketStatus.OPEN}>OPEN</Tabs.Tab>
              <Tabs.Tab value={TicketStatus.IN_PROGRESS}>IN_PROGRESS</Tabs.Tab>
              <Tabs.Tab value={TicketStatus.RESOLVED}>RESOLVED</Tabs.Tab>
              <Tabs.Tab value={TicketStatus.CLOSED}>CLOSED</Tabs.Tab>
            </Tabs.List>
          </Grid.Col>
          <Grid.Col span={3}>
            <RateupButtonPrimary
              onClick={() => setSort(!sort)}
              title={"Sort"}
              variant="subtle"
              rightIcon={<IconSelector size="1rem" />}
            />
          </Grid.Col>
        </Grid>

        <Box className={styles["tab-panel-container"]}>
          <Tabs.Panel value={TicketStatus.OPEN}>
            <TicketsPanel tickets={tickets} sort={sort} status={activeTab} />
          </Tabs.Panel>
          <Tabs.Panel value={TicketStatus.IN_PROGRESS}>
            <TicketsPanel tickets={tickets} sort={sort} status={activeTab} />
          </Tabs.Panel>
          <Tabs.Panel value={TicketStatus.RESOLVED}>
            <TicketsPanel tickets={tickets} sort={sort} status={activeTab} />
          </Tabs.Panel>
          <Tabs.Panel value={TicketStatus.CLOSED}>
            <TicketsPanel tickets={tickets} sort={sort} status={activeTab} />
          </Tabs.Panel>
        </Box>
      </StyledTabs>
    </Stack>
  );
};

export default TicketsHome;

function TicketsPanel({ tickets, status, sort }) {
  return (
    <>
      {tickets?.length > 0 ? (
        <SurveyCardLayout>
          {tickets
            ?.filter((t) => t.status === status)
            .sort((a, b) =>
              sort
                ? new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                : new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
            )
            .map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </SurveyCardLayout>
      ) : (
        <NothingFound text="No Tickets Found" />
      )}
    </>
  );
}
