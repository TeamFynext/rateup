import { Group, Stack } from "@mantine/core";
import { SentimentOverTime } from "../../../components/reputationManagement/InsightCards/SentimentOverTime";
import { SentimentSummaryCard } from "../../../components/reputationManagement/InsightCards/SentimentSummaryCard";
import { RatingSummaryCard } from "../../../components/reputationManagement/InsightCards/RatingSummaryCard";
import { WordCloudCard } from "../../../components/reputationManagement/InsightCards/WordCloudCard";
import { ReviewWithAnalysis } from "../../../backend/reputation_management/review/review.api";
import { getSentimentClass } from "../../../utils/reputationManagement/sentiment.util";
import dayjs from "dayjs";
import { RatingOverTime } from "../InsightCards/RatingOverTime";
import { SentimentByTopic } from "../InsightCards/SentimentByTopic";
import { FilterSideBar } from "../misc/FilterSideBar";
import PaperLayout from "../../styled/Layouts/PaperLayout";

interface RM_OverviewProps {
  filteredReviews: ReviewWithAnalysis[];
  filters: ReviewsFilter;
  setFilters: (filters: ReviewsFilter) => void;
}

export function RM_Overview({
  filteredReviews,
  filters,
  setFilters,
}: RM_OverviewProps) {
  if (!filteredReviews) return null;

  const {
    ratingInsights,
    sentimentInsights,
    entitiesData,
    sentimentOverTime,
    ratingOverTime,
  } = createInsights(filteredReviews);

  return (
    <Group align={"stretch"} gap={0} p={0}>
      <FilterSideBar
        style={{
          flex: 0,
          minWidth: "200px",
        }}
        filters={filters}
        setFilters={setFilters}
      />
      <Stack
        h="100%"
        style={{
          overflow: "auto",
          flex: 1,
        }}
        px={8}
        pb={8}
        gap={8}
      >
        <Group align="stretch" gap={8}>
          <Stack
            style={{
              flex: 1,
            }}
            gap={8}
          >
            <RatingSummaryCard ratingInsights={ratingInsights} />
            <SentimentSummaryCard sentimentInsights={sentimentInsights} />
          </Stack>
          {/*TODO: apply maxheight of parent = height(ratingCard) + height(reviewCard)  */}
          <WordCloudCard
            wordCloudData={entitiesData}
            style={{
              flex: 1,
            }}
          />
        </Group>
        <Group gap={8}>
          <RatingOverTime
            ratingOverTime={ratingOverTime}
            style={{
              flex: 1,
            }}
          />
          <SentimentOverTime
            sentimentOverTime={sentimentOverTime}
            style={{
              flex: 1,
            }}
          />
        </Group>
        <Group gap={8} align="stretch">
          <SentimentByTopic
            entities={entitiesData}
            style={{
              flex: 1,
            }}
          />
          <PaperLayout
            style={{
              flex: 1,
              visibility: "hidden",
            }}
          />
        </Group>
      </Stack>
    </Group>
  );
}

function createInsights(reviews: ReviewWithAnalysis[]) {
  const ratingInsights = {
    totalCount: 0,
    avg: 0,
    individualCount: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  };
  const sentimentInsights = {
    totalCount: 0,
    avg: 0,
    classifiedCount: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
  };
  const sentimentOverTime: {
    [date: string]: number[];
  } = {};
  const ratingOverTime: {
    [date: string]: number[];
  } = {};
  const entitiesData: EntitiesData = {};

  reviews.forEach((review) => {
    const date = dayjs(review.reviewedAt).format("YYYY-MM-DD");

    if (review.rating) {
      // rating insights
      ratingInsights.totalCount += 1;
      ratingInsights.avg += review.rating;
      ratingInsights.individualCount[review.rating] += 1;

      // rating over time
      if (!ratingOverTime[date]) {
        ratingOverTime[date] = [];
      }
      ratingOverTime[date].push(review.rating);
    }
    if (review.ReviewAnalysis) {
      // sentiment insights
      sentimentInsights.totalCount += 1;
      sentimentInsights.avg += review.ReviewAnalysis.sentiment;
      sentimentInsights.classifiedCount[
        getSentimentClass(review.ReviewAnalysis.sentiment)
      ] += 1;

      // sentiment over time
      if (!sentimentOverTime[date]) {
        sentimentOverTime[date] = [];
      }
      sentimentOverTime[date].push(review.ReviewAnalysis.sentiment);

      // word cloud
      if (review.ReviewAnalysis.entities) {
        review.ReviewAnalysis.entities.forEach((entity) => {
          const name = entity.name.toLowerCase();
          if (entitiesData[name]) {
            entitiesData[name].sentiments.push(entity.score);
          } else {
            entitiesData[name] = {
              sentiments: [entity.score],
              count: 0,
              sentiment: 0,
            };
          }
        });
      }
    }
  });
  sentimentInsights.avg = sentimentInsights.avg / sentimentInsights.totalCount;
  ratingInsights.avg = ratingInsights.avg / ratingInsights.totalCount;
  Object.keys(entitiesData).forEach((key) => {
    entitiesData[key].sentiment =
      entitiesData[key].sentiments.reduce((a, b) => a + b, 0) /
      entitiesData[key].sentiments.length;
    entitiesData[key].count = entitiesData[key].sentiments.length;
  });

  return {
    ratingInsights,
    sentimentInsights,
    entitiesData,
    sentimentOverTime,
    ratingOverTime,
  };
}

export interface EntitiesData {
  [key: string]: {
    count: number;
    sentiment: number;
    sentiments: number[];
  };
}
