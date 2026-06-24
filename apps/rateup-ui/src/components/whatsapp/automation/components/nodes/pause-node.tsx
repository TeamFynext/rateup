import { Group, Text } from "@mantine/core";
import { IconClockPause } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { PauseNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

function PauseNode(props: NodeProps & { data: PauseNodeData }) {
  return (
    <BaseNode {...props} icon={<IconClockPause size={16} />} color="#f59e0b">
      <Group>
        <Text size="sm" fw={500} c="dimmed">
          {props.data.duration} {props.data.unit}
        </Text>
      </Group>
    </BaseNode>
  );
}

export default memo(PauseNode);
