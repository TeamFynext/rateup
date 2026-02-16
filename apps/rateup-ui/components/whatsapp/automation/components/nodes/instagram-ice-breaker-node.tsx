"use client";

import { memo } from "react";

import { IconInputSpark } from "@tabler/icons-react";
import { Handle, NodeProps, Position } from "@xyflow/react";

import BaseNode from "./base-node";

interface InstagramIceBreakerNodeData {
  label: string;
  iceBreakers?: Array<{
    question: string;
    payload?: string;
  }>;
}

function InstagramIceBreakerNode(
  props: NodeProps & {
    data: InstagramIceBreakerNodeData;
    isConnectable: boolean;
  },
) {
  const { data, isConnectable } = props;
  const iceBreakerCount = data.iceBreakers?.length || 0;

  return (
    <BaseNode {...props} icon={<IconInputSpark size={18} />} color="#06b6d4">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="bg-cyan-500!"
      />
      <div className="text-xs text-gray-500">
        {iceBreakerCount} ice breaker{iceBreakerCount !== 1 ? "s" : ""}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="bg-cyan-500!"
      />
    </BaseNode>
  );
}

export default memo(InstagramIceBreakerNode);
