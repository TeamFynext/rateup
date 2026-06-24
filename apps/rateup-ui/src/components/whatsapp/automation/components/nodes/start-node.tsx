import { Group, Text } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { StartNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

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
