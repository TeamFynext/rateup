import { memo } from "react";

import { Text } from "@mantine/core";
import { IconGitBranch } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { FlowNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

function FlowNode(props: NodeProps & { data: FlowNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconGitBranch size={16} />} color="#ef4444">
      <Text>{data?.flow?.name}</Text>
    </BaseNode>
  );
}

export default memo(FlowNode);
