import { Button, Group, PaperProps, Stack, Table, Text } from "@mantine/core";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useDisclosure } from "@mantine/hooks";
import { CreateTopicModal } from "../modals/CreateTopic";
import { useRMTopics } from "../../../backend/reputation_management/topic/topic.query";
import { useContext } from "react";
import SelectedTeamContext from "../../../context/SelectedTeam";
import { getSentimentClass } from "../../../utils/reputationManagement/sentiment.util";
import { SentimentClass } from "../../../types/enums";
import { EntitiesData } from "../panels/RM_Overview";
import { IconAdjustmentsPlus } from "@tabler/icons-react";

interface SentimentByTopicProps {
  entities: EntitiesData;
}

const colorMap = {
  [SentimentClass.POSITIVE]: "#65BC76",
  [SentimentClass.NEUTRAL]: "#FDCE06",
  [SentimentClass.NEGATIVE]: "#FF718B",
};
export function SentimentByTopic({
  entities,
  ...props
}: SentimentByTopicProps & PaperProps) {
  const [createTopicOpened, { open, close }] = useDisclosure(false);
  const { selectedTeamId } = useContext(SelectedTeamContext);

  const {
    data: topics,
    isLoading: isTopicsLoading,
    isError: isTopicsError,
  } = useRMTopics(selectedTeamId);

  if (isTopicsLoading) return <div>loading</div>;
  if (isTopicsError) return <div>error</div>;

  return (
    <PaperLayout {...props}>
      <Stack>
        <Text
          style={{
            fontSize: "16px",
            fontWeight: 600,
          }}
          c="#666"
        >
          Sentiment by Topic
        </Text>

        <Table withRowBorders={false}>
          {topics.length > 0 ? (
            <>
              {topics.map((topic) => {
                const topicSentiment = getSentimentOfTopic(topic, entities);
                const totalCount = Object.values(topicSentiment).reduce(
                  (sum, count) => sum + count,
                  0,
                );

                return (
                  <Table.Tr>
                    <Table.Td
                      style={{
                        width: "auto",
                      }}
                    >
                      <Text>{topic.name}</Text>
                    </Table.Td>
                    <Table.Td
                      style={{
                        width: "100%",
                      }}
                    >
                      <Group
                        gap={4}
                        style={{
                          flexGrow: 1,
                        }}
                      >
                        {[
                          SentimentClass.NEGATIVE,
                          SentimentClass.NEUTRAL,
                          SentimentClass.POSITIVE,
                        ].map((sentiment) => (
                          <Text
                            style={{
                              backgroundColor: colorMap[sentiment],
                              borderRadius: "4px",
                              flex:
                                totalCount === 0
                                  ? 1
                                  : topicSentiment[sentiment] / totalCount,
                              textAlign: "center",
                              color: "white",
                              transition: "flex 200ms ease",
                            }}
                            p="xs"
                          >
                            {topicSentiment[sentiment]}
                          </Text>
                        ))}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </>
          ) : (
            <Text px="md" c="gray">
              Add a topic to see view it's sentiment
            </Text>
          )}
        </Table>
        <Button
          leftSection={<IconAdjustmentsPlus />}
          onClick={open}
          variant="subtle"
          color="gray"
        >
          Manage Topics
        </Button>
        <CreateTopicModal
          opened={createTopicOpened}
          onClose={close}
          entities={entities}
        />
      </Stack>
    </PaperLayout>
  );
}

function getSentimentOfTopic(topic: RM_Topic, entities: EntitiesData) {
  const topicSentiment = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  topic.keywords.forEach((keyword) => {
    if (!entities[keyword]) return;
    entities[keyword].sentiments.forEach((sentiment) => {
      topicSentiment[getSentimentClass(sentiment)]++;
    });
  });

  return topicSentiment;
}
