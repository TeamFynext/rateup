import { Group, Stack, Text } from "@mantine/core";
import { IconLocation } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { LocationNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

function LocationNode(props: NodeProps & { data: LocationNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconLocation size={16} />} color="#f59e0b">
      <Stack gap="xs">
        {data.name && (
          <Group gap="xs">
            <Text fw={600} size="sm">
              Name:
            </Text>
            <Text size="sm" c="dimmed">
              {data.name}
            </Text>
          </Group>
        )}
        <Group gap="xs">
          <Text fw={600} size="sm">
            Latitude:
          </Text>
          <Text size="sm" c="dimmed">
            {data.latitude}
          </Text>
        </Group>
        <Group gap="xs">
          <Text fw={600} size="sm">
            Longitude:
          </Text>
          <Text size="sm" c="dimmed">
            {data.longitude}
          </Text>
        </Group>
        {data.address && (
          <Group gap="xs">
            <Text fw={600} size="sm">
              Address:
            </Text>
            <Text size="sm" c="dimmed">
              {data.address}
            </Text>
          </Group>
        )}
      </Stack>
    </BaseNode>
  );
}
export default memo(LocationNode);
