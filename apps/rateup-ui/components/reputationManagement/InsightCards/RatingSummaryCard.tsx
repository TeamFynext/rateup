import {
  Center,
  Group,
  Progress,
  Rating,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { IconStarFilled } from "@tabler/icons-react";

interface RatingInsights {
  avg: number;
  totalCount: number;
  individualCount: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
interface RatingSummaryCardProps {
  ratingInsights: RatingInsights;
}

export const ratingColorMap = {
  1: "#FF5C55",
  2: "#ff922b",
  3: "#FEDC4E",
  4: "#A6E346",
  5: "#52BA66",
};
export function RatingSummaryCard({ ratingInsights }: RatingSummaryCardProps) {
  const theme = useMantineTheme();
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
            {`Total Rating:`}
          </Text>
          <Text
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "white",
            }}
          >
            {ratingInsights.totalCount}
          </Text>
        </Center>
        <Group p="md" pt="lg">
          <Stack
            style={{
              flex: 1,
            }}
          >
            {Object.entries(ratingInsights.individualCount).map(
              ([key, value]) => (
                <Group key={key}>
                  <Group gap={"4px"}>
                    <Text>{key}</Text>
                    <IconStarFilled
                      style={{
                        color: "gold",
                        width: "16px",
                      }}
                    />
                  </Group>
                  <Tooltip
                    label={`${(
                      (value / ratingInsights.totalCount) *
                      100
                    ).toFixed(2)} %`}
                    withArrow
                    openDelay={100}
                  >
                    <Progress
                      value={
                        Math.floor((value / ratingInsights.totalCount) * 100) +
                        20
                      }
                      style={{
                        flexGrow: 1,
                        cursor: "pointer",
                      }}
                      size={"lg"}
                      radius={"xl"}
                      color={ratingColorMap[key]}
                    />
                  </Tooltip>
                  <Text w="60px">{value}</Text>
                </Group>
              ),
            )}
          </Stack>
          <Stack h="100%" align="center" gap={0}>
            <Text
              style={{
                fontSize: "3rem",
                fontWeight: 600,
              }}
            >
              {ratingInsights.avg.toFixed(1)}
            </Text>
            <Rating
              value={ratingInsights.avg}
              readOnly
              fractions={4}
              size="lg"
            />
          </Stack>
        </Group>
      </>
    </PaperLayout>
  );
}
