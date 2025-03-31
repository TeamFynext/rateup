import { memo } from "react";

import { Text } from "@mantine/core";
import { IconTemplate } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { TemplateNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

function TemplateNode(props: NodeProps & { data: TemplateNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconTemplate size={16} />} color="#8b5cf6">
      <Text>{data?.template?.name}</Text>
    </BaseNode>
  );
}

export default memo(TemplateNode);
