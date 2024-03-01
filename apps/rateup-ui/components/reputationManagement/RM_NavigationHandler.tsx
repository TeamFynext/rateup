import { Group, Stack, Tabs, Text, useMantineTheme } from "@mantine/core";
import { useEffect, useState } from "react";
import { RM_Overview } from "./panels/RM_Overview";
import { RM_Review } from "./panels/RM_Review";
import { TeamSelector } from "../input/TeamSelector";
import { useReviewsWithAnalysis } from "../../backend/reputation_management/review/review.query";
import RateupLoader from "../Loaders/RateupLoader";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import isBetween from "dayjs/plugin/isBetween";
import dayjs from "dayjs";
import { Range } from "react-date-range";
import SelectedTeamContext from "../../context/SelectedTeam";
import { SentimentClass } from "../../types/enums";
import { useImmer } from "use-immer";
import { ReviewWithAnalysis } from "../../backend/reputation_management/review/review.api";
import { getSentimentClass } from "../../utils/reputationManagement/sentiment.util";
import { DateRangePickerButton } from "./misc/DateRangePicker";

dayjs.extend(isBetween);
enum RM_NavigationTabs {
  OVERVIEW = "Overview",
  REVIEWS = "Reviews",
}

const defaultFilters: ReviewsFilter = {
  sentiment: {
    ...(Object.values(SentimentClass).reduce(
      (acc, sentiment) => ({ ...acc, [sentiment]: false }),
      {},
    ) as ReviewsFilter["sentiment"]),
  },
  rating: {
    ...[1, 2, 3, 4, 5].reduce(
      (acc, rating) => ({ ...acc, [rating.toString()]: false }),
      {},
    ),
  },
};

function filterReviews(
  reviews: ReviewWithAnalysis[],
  filters: any,
  ranges: any,
) {
  const rangeFiltered = ranges[0]
    ? reviews?.filter((review) =>
        dayjs(review.reviewedAt).isBetween(
          ranges[0].startDate,
          ranges[0].endDate,
          null,
          "[]",
        ),
      )
    : reviews;

  const filteredReviews = Object.keys(filters).every((key) =>
    Object.values(filters[key]).every((v) => v === false),
  ) // no filters applied
    ? rangeFiltered
    : rangeFiltered.filter((review) => {
        if (
          review.ReviewAnalysis?.sentiment &&
          filters.sentiment[getSentimentClass(review.ReviewAnalysis.sentiment)]
        ) {
          return true;
        }
        if (filters.rating[review.rating.toString()]) {
          return true;
        }
        return false;
      });

  return filteredReviews;
}
export function RM_NavigationHandler() {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const {
    data: reviews,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
  } = useReviewsWithAnalysis(selectedTeamId);
  const [ranges, setRange] = useState<Range[]>([]);
  const [filters, setFilters] = useImmer(defaultFilters);

  useEffect(() => {
    if (!reviews || reviews.length === 0) return;
    if (ranges.length === 0) {
      const endDate = dayjs();
      const startDate = reviews?.reduce(
        (min, r) => (r.reviewedAt.isBefore(min) ? r.reviewedAt : min),
        endDate,
      );
      setRange([
        {
          startDate: startDate?.toDate(),
          endDate: endDate.toDate(),
          key: "selection",
        },
      ]);
    }
  }, [reviews, ranges]);

  const [activeTab, setActiveTab] = useState<string | null>(
    RM_NavigationTabs.OVERVIEW,
  );
  const theme = useMantineTheme();
  if (isReviewsLoading) return <RateupLoader />;
  if (isReviewsError) return <div>error</div>;

  const filteredReviews = filterReviews(reviews, filters, ranges);

  return (
    <SelectedTeamContext.Provider value={{ selectedTeamId }}>
      <Stack
        gap={0}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          maxHeight: "100%",
        }}
      >
        <Tabs
          h="100%"
          value={activeTab}
          onChange={setActiveTab}
          keepMounted={false}
          styles={{
            tab: {
              borderBottomWidth: "4px",
            },
            root: {
              height: "100%",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <Group justify="space-between" mb="sm">
            <Group>
              {Object.values(RM_NavigationTabs).map((tab) => (
                <Tabs.Tab key={tab} value={tab}>
                  <Text
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#9C9C9C",
                      ...(activeTab === tab
                        ? { color: theme.colors[theme.primaryColor][6] }
                        : {}),
                    }}
                  >
                    {tab}
                  </Text>
                </Tabs.Tab>
              ))}
            </Group>
            <Group>
              <DateRangePickerButton
                onChange={(r) => setRange(r ? [r["selection"]] : [])}
                ranges={ranges}
              />
              <TeamSelector
                style={{
                  flex: 1,
                }}
                value={selectedTeamId}
                onChange={setSelectedTeamId}
              />
            </Group>
          </Group>
          <Tabs.Panel value={RM_NavigationTabs.OVERVIEW}>
            <RM_Overview
              filteredReviews={filteredReviews}
              filters={filters}
              setFilters={setFilters}
            />
          </Tabs.Panel>
          <Tabs.Panel
            style={{
              flex: 1,
            }}
            value={RM_NavigationTabs.REVIEWS}
          >
            <RM_Review
              filteredReviews={filteredReviews}
              filters={filters}
              setFilters={setFilters}
              selectedTeamId={selectedTeamId}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </SelectedTeamContext.Provider>
  );
}
