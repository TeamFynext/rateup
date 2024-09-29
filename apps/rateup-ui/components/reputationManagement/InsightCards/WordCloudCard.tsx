import { memo, useEffect, useState } from "react";

import {
  Box,
  Center,
  PaperProps,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";
import { scaleLog } from "@visx/scale";
import { Text as VText } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";

import useTranslations from "@/dictionaries/useTranslation";

import PaperLayout from "../../styled/Layouts/PaperLayout";
import { EntitiesData } from "../panels/RM_Overview";

interface WordCloudProps {
  wordCloudData: EntitiesData;
}

export interface WordData {
  text: string;
  value: number;
}
const colors = ["#143059", "#43597A", "#72839B", "#A1ACBD"];
function getRotationDegree() {
  const rand = Math.random();
  const degree = rand > 0.5 ? -90 : 0;
  return degree;
}
const fixedValueGenerator = () => 0.5;

export const WordCloudCard = memo(function WordCloudCard({
  wordCloudData,
  ...props
}: WordCloudProps & PaperProps) {
  const theme = useMantineTheme();
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(300);
  const { translations } = useTranslations();
  wordCloudData = Object.fromEntries(
    Object.entries(wordCloudData)
      .filter(([key, value]) => value.count > 1)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 100),
  );

  const [ref, rect] = useResizeObserver();

  useEffect(() => {
    if (rect.width) {
      setWidth(rect.width);
    }
    if (rect.height) {
      setHeight(rect.height);
    }
  }, [rect.width, rect.height]);

  let words: WordData[] = Object.entries(wordCloudData).map(([key, value]) => ({
    text: key,
    value: value.count,
  }));

  words = words.sort((a, b) => b.value - a.value);
  const fontScale = scaleLog({
    domain: [
      Math.min(...words.map((w) => w.value)),
      Math.max(...words.map((w) => w.value)),
    ],
    range: [8, 60],
  });
  const fontSizeSetter = (datum: WordData) => fontScale(datum.value);
  return (
    <PaperLayout p="0" {...props}>
      <Stack gap={0} h="100%">
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
          >
            {translations["Word Cloud"]}
          </Text>
        </Center>

        <Box
          p="md"
          ref={ref}
          w={"100%"}
          style={{
            flexGrow: 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
            }}
          >
            <Wordcloud
              words={words}
              width={width}
              height={height - 10} // hacky way to prevent wordcloud from increasing height of parent
              fontSize={fontSizeSetter}
              font={"Source Sans Pro"}
              padding={6}
              spiral={"archimedean"}
              rotate={getRotationDegree}
              random={fixedValueGenerator}
            >
              {(cloudWords) =>
                cloudWords.map((w, i) => (
                  <VText
                    key={w.text}
                    fill={colors[i % colors.length]}
                    textAnchor={"middle"}
                    transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                    fontSize={w.size}
                    fontFamily={w.font}
                  >
                    {w.text}
                  </VText>
                ))
              }
            </Wordcloud>
          </div>
        </Box>
      </Stack>
    </PaperLayout>
  );
});
