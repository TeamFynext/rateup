import { memo } from "react";

import { Text } from "@mantine/core";
import { IconGitBranch } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

function FlowNode(props: NodeProps & { data: FlowNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconGitBranch size={16} />} color="#ef4444">
      <Text>{data?.flow?.name}</Text>
    </BaseNode>
  );
}

export default memo(FlowNode);
