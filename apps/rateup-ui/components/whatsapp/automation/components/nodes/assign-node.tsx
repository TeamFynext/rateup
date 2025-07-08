import { memo } from "react";

import { Box, Group, Stack, Text } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { AssignNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

function AssignNode(props: NodeProps & { data: AssignNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconUser size={16} />} color="#009688">
      <Box>
        <Text fw={600} mb="xs">
          Assign Chat
        </Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Assign Type:
            </Text>
            <Text size="sm">{data.assign?.assignType}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              choice :
            </Text>
            <Text size="sm">{data.assign?.choice}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Assign If Online:
            </Text>
            <Text size="sm">
              {data.assign.assignIfOnline
                ? "Only if online"
                : "Regardless of status"}
            </Text>
          </Group>
          {data.assign?.assignType === "staff" && (
            <>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Team Name:
                </Text>
                <Text size="sm">{data.assign?.teamName}</Text>
              </Group>
              {data.assign?.choice === "all" && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Round Robin:
                  </Text>
                  <Text size="sm">
                    {data.assign?.roundRobin ? "Yes" : "No"}
                  </Text>
                </Group>
              )}
            </>
          )}
        </Stack>
      </Box>
    </BaseNode>
  );
}

export default memo(AssignNode);
