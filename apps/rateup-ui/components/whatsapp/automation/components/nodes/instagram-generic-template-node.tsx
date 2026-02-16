"use client";

import { memo } from "react";

import { IconCards } from "@tabler/icons-react";
import { Handle, NodeProps, Position } from "@xyflow/react";

import BaseNode from "./base-node";

interface InstagramGenericTemplateNodeData {
  label: string;
  elements?: Array<{
    title: string;
    subtitle?: string;
    image_url?: string;
    buttons?: Array<{
      type: string;
      title: string;
      url?: string;
    }>;
  }>;
}

function InstagramGenericTemplateNode(
  props: NodeProps & {
    data: InstagramGenericTemplateNodeData;
    isConnectable: boolean;
  },
) {
  const { data, isConnectable } = props;
  const elementCount = data.elements?.length || 0;

  return (
    <BaseNode {...props} icon={<IconCards size={18} />} color="#a855f7">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="bg-purple-500!"
      />
      <div className="text-xs text-gray-500">
        {elementCount} card{elementCount !== 1 ? "s" : ""}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="bg-purple-500!"
      />
    </BaseNode>
  );
}

export default memo(InstagramGenericTemplateNode);
