import { memo } from "react";

import { Text } from "@mantine/core";
import { IconRobotFace } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import type { AiBotNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

function AiBotNode(props: NodeProps & { data: AiBotNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconRobotFace size={16} />} color="#ef4444">
      {/* <div className={styles.textContent}>
        {data.body
          ? parseJsonToReact(data.body)
          : "Double-click to edit message"}
      </div> */}
      <Text>{data?.chatbot?.name}</Text>
    </BaseNode>
  );
}

export default memo(AiBotNode);
