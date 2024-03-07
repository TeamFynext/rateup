import {
  Box,
  Button,
  Flex,
  Group,
  Menu,
  Stack,
  Text,
  rem,
} from "@mantine/core";
import { ReviewWithAnalysis } from "../../../backend/reputation_management/review/review.api";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import SearchBox from "../../input/SearchBox";
import { useEffect, useState } from "react";
import { ReviewPlatform, SortType } from "../../../types/enums";
import { GoogleIcon } from "../../Button/GoogleIcon";
import {
  IconChevronDown,
  IconTicket,
  IconStarFilled,
} from "@tabler/icons-react";
import { ratingColorMap } from "../InsightCards/RatingSummaryCard";
import { SortableField } from "../../input/SortableField";
import React from "react";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import classes from "./RM_Review.module.css";
import { FilterSideBar } from "../misc/FilterSideBar";
import { useDisclosure } from "@mantine/hooks";
import CreateTicketModal from "../../Tickets/CreateTicketModal";
import { TicketType } from "../../../utils/enums/ticket";

interface RM_ReviewProps {
  filteredReviews: ReviewWithAnalysis[];
  filters: ReviewsFilter;
  setFilters: (filters: ReviewsFilter) => void;
  selectedTeamId: string;
}
export function RM_Review({
  filteredReviews,
  filters,
  setFilters,
  selectedTeamId,
}: RM_ReviewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!filteredReviews) return <div>loading</div>;

  const searchFilteredReviews =
    searchTerm === ""
      ? filteredReviews
      : filteredReviews.filter((review) =>
          review.review?.toLowerCase().includes(searchTerm.toLowerCase()),
        );

  return (
    <Group
      align={"stretch"}
      gap={0}
      p={0}
      style={{
        height: "100%",
      }}
    >
      <FilterSideBar
        style={{
          flex: 0,
          minWidth: "200px",
        }}
        filters={filters}
        setFilters={setFilters}
      />
      <PaperLayout
        style={{
          position: "relative",
          height: "100%",
          flex: 1,
        }}
        mx="xs"
      >
        <Stack maw="100%" h={"100%"}>
          <SearchBox
            placeholder="Search reviews"
            searchText={searchTerm}
            setSearchText={setSearchTerm}
          />
          <RenderReviewTable
            filteredReviews={searchFilteredReviews}
            selectedTeamId={selectedTeamId}
          />
        </Stack>
      </PaperLayout>
    </Group>
  );
}

const RenderReviewTable = function RenderReviewTable({
  filteredReviews,
  selectedTeamId,
}: {
  filteredReviews: ReviewWithAnalysis[];
  selectedTeamId: string;
}) {
  const [sort, setSort] = useState({
    sortKey: "reviewedAt",
    sortType: SortType.DESC,
  });
  const [
    createTicketOpened,
    { open: openTicketModal, close: closeTicketModal },
  ] = useDisclosure(false);
  const [selectedReviewId, setSelectedReviewId] = useState("");

  if (!filteredReviews) return <div>loading</div>;

  const sortedReviews = filteredReviews.sort((a, b) => {
    if (a[sort.sortKey] === null) {
      return sort.sortType === SortType.ASC ? 1 : -1;
    } else if (b[sort.sortKey] === null) {
      return sort.sortType === SortType.ASC ? -1 : 1;
    }
    return sort.sortType === SortType.ASC
      ? a[sort.sortKey] - b[sort.sortKey]
      : b[sort.sortKey] - a[sort.sortKey];
  });

  useEffect(() => {
    if (selectedReviewId !== "") {
      openTicketModal();
      console.log(selectedReviewId);
    }
  }, [selectedReviewId]);

  return (
    <Stack
      p="lg"
      classNames={{
        root: classes.root,
      }}
      h="100%"
      style={{
        overflow: "clip",
      }}
      gap={0}
    >
      <Flex
        className="row"
        gap={"md"}
        style={{
          backgroundColor: "whitesmoke",
        }}
      >
        <SortableField sortKey={"platform"} sort={sort} setSort={setSort}>
          Platform
        </SortableField>
        <SortableField sortKey={"rating"} sort={sort} setSort={setSort}>
          Rating
        </SortableField>
        <SortableField
          sortKey={"review"}
          sort={sort}
          setSort={setSort}
          style={{
            flex: 1,
          }}
        >
          Review
        </SortableField>
        <SortableField sortKey={"reviewedAt"} sort={sort} setSort={setSort}>
          Date
        </SortableField>
        <Text style={{ minWidth: "140px" }}></Text>
      </Flex>

      <CreateTicketModal
        createTicketOpened={createTicketOpened}
        openTicketModal={openTicketModal}
        closeTicketModal={closeTicketModal}
        selectedTeamId={selectedTeamId}
        type={TicketType.REVIEW}
        rid={selectedReviewId}
      />

      <Box
        style={{
          flex: 1,
        }}
      >
        <AutoSizer
          style={{
            padding: "10px",
            flex: 1,
          }}
        >
          {({ height, width }) => (
            <FixedSizeList
              height={height}
              width={width}
              itemCount={sortedReviews.length}
              itemSize={64}
            >
              {({ index, style }) => {
                const review = sortedReviews[index];
                return (
                  <Flex
                    key={review?.id}
                    gap={"md"}
                    h="64px"
                    align="center"
                    style={{
                      borderBottom: "1px solid lightgrey",
                      ...style,
                    }}
                    className="row"
                  >
                    <Text>
                      <PlatformIcon platform={review?.platform} />
                    </Text>
                    <Text>
                      <RatingBadge rating={review?.rating} />
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                      }}
                      lineClamp={2}
                    >
                      {review.review}
                    </Text>
                    <Text>{review.reviewedAt.format("DD/MM/YYYY")}</Text>
                    <ActionMenu
                      reviewId={review?.id}
                      setSelectedReviewId={setSelectedReviewId}
                      ticketData={review?.Ticket}
                    />
                  </Flex>
                );
              }}
            </FixedSizeList>
          )}
        </AutoSizer>
      </Box>
    </Stack>
  );
};
export function PlatformIcon({ platform }: { platform: ReviewPlatform }) {
  switch (platform) {
    case ReviewPlatform.GOOGLE:
      return <GoogleIcon />;
    case ReviewPlatform.FACEBOOK:
      return (
        <img
          src="/icons/facebook.svg"
          alt="facebook"
          style={{ width: "20px" }}
        />
      );
    default:
      return (
        <img src="/icons/google.svg" alt="google" style={{ width: "20px" }} />
      );
  }
}

export function RatingBadge({ rating }: { rating: number }) {
  return (
    <Flex
      gap={"8px"}
      wrap="nowrap"
      justify="space-evenly"
      px="xs"
      align="center"
      style={{
        width: "fit-content",
        backgroundColor: ratingColorMap[Math.ceil(rating)],
        borderRadius: "8px",
        padding: "4px 8px",
      }}
    >
      <Text c="white" fw={800}>
        {rating}
      </Text>
      <IconStarFilled
        style={{
          color: "white",
        }}
      />
    </Flex>
  );
}

function ActionMenu({ reviewId, setSelectedReviewId, ticketData }) {
  const ticketExist = ticketData?.length > 0;

  return (
    <Stack px="sm">
      <Menu
        position="bottom-end"
        offset={4}
        withArrow
        arrowPosition="side"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
      >
        <Menu.Target>
          <Button
            variant="outline"
            color="dark.2"
            radius="lg"
            size="xs"
            rightSection={<IconChevronDown size="1rem" />}
          >
            <Text size="xs" c="dark.5">
              {" "}
              Select Action{" "}
            </Text>
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            color={ticketExist ? "orange" : "blue.7"}
            onClick={() => {
              if (ticketExist) {
                let url = `/dashboard/tickets/${ticketData[0]?.id}`;
                window.open(url, "_blank");
              } else {
                setSelectedReviewId(reviewId);
              }
            }}
            leftSection={
              <IconTicket style={{ width: rem(14), height: rem(14) }} />
            }
          >
            {ticketExist ? " View Ticket" : "Create Ticket"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Stack>
  );
}
