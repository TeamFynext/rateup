import { Center, Group, Stack, Text, useMantineTheme } from "@mantine/core";
import { IconMoodEmpty, IconMoodSad, IconMoodSmile } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import { SentimentClass } from "../../../types/enums";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ratingColorMap } from "./RatingSummaryCard";

interface SentimentInsights {
  avg: number;
  totalCount: number;
  classifiedCount: {
    [SentimentClass.NEGATIVE]: number;
    [SentimentClass.NEUTRAL]: number;
    [SentimentClass.POSITIVE]: number;
  };
}
interface SentimentSummaryCardProps {
  sentimentInsights: SentimentInsights;
}
export function SentimentSummaryCard({
  sentimentInsights,
}: SentimentSummaryCardProps) {
  const theme = useMantineTheme();
  const { translations } = useTranslations();
  return (
    <PaperLayout p="0">
      <>
        <Center
          style={{
            backgroundColor: theme.colors[theme.primaryColor][6],
          }}
          p="xs"
        >
          <Text
            style={{
              fontSize: "16px",
              color: "white",
            }}
            mr="xs"
          >
            {translations["Total Reviews:"]}
          </Text>
          <Text
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "white",
            }}
          >
            {sentimentInsights.totalCount}
          </Text>
        </Center>
        <Group justify="space-evenly">
          <Stack
            p="sm"
            style={{
              color: ratingColorMap[5],
            }}
            align="center"
          >
            <Text
              style={{
                fontSize: "1.4rem",
                fontWeight: 600,
              }}
            >
              {sentimentInsights.classifiedCount[SentimentClass.POSITIVE]}
            </Text>
            <IconMoodSmile
              style={{
                width: "40px",
                height: "auto",
              }}
            />
            <Text
              style={{
                fontSize: "1.2rem",
              }}
            >
              {translations["Positive"]}
            </Text>
          </Stack>
          <Stack
            p="sm"
            style={{
              color: ratingColorMap[3],
            }}
            align="center"
          >
            <Text
              style={{
                fontSize: "1.4rem",
                fontWeight: 600,
              }}
            >
              {sentimentInsights.classifiedCount[SentimentClass.NEUTRAL]}
            </Text>
            <IconMoodEmpty
              style={{
                width: "40px",
                height: "auto",
              }}
            />
            <Text
              style={{
                fontSize: "1.2rem",
              }}
            >
              {translations["Neutral"]}
            </Text>
          </Stack>
          <Stack
            p="sm"
            style={{
              color: ratingColorMap[1],
            }}
            align="center"
          >
            <Text
              style={{
                fontSize: "1.4rem",
                fontWeight: 600,
              }}
            >
              {sentimentInsights.classifiedCount[SentimentClass.NEGATIVE]}
            </Text>
            <IconMoodSad
              style={{
                width: "40px",
                height: "auto",
              }}
            />
            <Text
              style={{
                fontSize: "1.2rem",
              }}
            >
              {translations["Negative"]}
            </Text>
          </Stack>
        </Group>
      </>
    </PaperLayout>
  );
}
