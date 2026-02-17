"use client";

import { memo } from "react";

import { IconMessages } from "@tabler/icons-react";
import { Handle, NodeProps, Position } from "@xyflow/react";

import BaseNode from "./base-node";

interface InstagramQuickReplyNodeData {
  label: string;
  text?: string;
  quick_replies?: Array<{
    content_type: string;
    title: string;
    payload?: string;
  }>;
}

function InstagramQuickReplyNode(
  props: NodeProps & {
    data: InstagramQuickReplyNodeData;
    isConnectable: boolean;
  },
) {
  const { data, isConnectable } = props;
  const replyCount = data.quick_replies?.length || 0;

  return (
    <BaseNode {...props} icon={<IconMessages size={18} />} color="#ec4899">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="bg-pink-500!"
      />
      <div className="text-xs text-gray-500">
        {replyCount} quick repl{replyCount !== 1 ? "ies" : "y"}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="bg-pink-500!"
      />
    </BaseNode>
  );
}

export default memo(InstagramQuickReplyNode);
