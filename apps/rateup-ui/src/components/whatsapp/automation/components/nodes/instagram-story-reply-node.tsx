import { IconBrandInstagram } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import BaseNode from "./base-node.tsx";

interface InstagramStoryReplyNodeData {
  label: string;
  text?: string;
  story_mention?: boolean;
}

function InstagramStoryReplyNode(
  props: NodeProps & {
    data: InstagramStoryReplyNodeData;
    isConnectable: boolean;
  },
) {
  const { data, isConnectable } = props;
  return (
    <BaseNode {...props} icon={<IconBrandInstagram size={18} />} color="#9333ea">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="bg-purple-600!"
      />
      <div className="text-xs text-gray-500">
        {data.story_mention ? "Story mention" : "Story reply"}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="bg-purple-600!"
      />
    </BaseNode>
  );
}

export default memo(InstagramStoryReplyNode);
