import { memo } from "react";

import { Group, Text } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { StartNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

function StartNode(props: NodeProps & { data: StartNodeData }) {
  return (
    <BaseNode {...props} icon={<IconPlayerPlay size={16} />} color="#4caf50">
      <Group>
        <Text size="sm" fw={500} c="dimmed">
          Start Node
        </Text>
      </Group>
    </BaseNode>
  );
}

export default memo(StartNode);
