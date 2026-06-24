import { IconShoppingCart } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import BaseNode from "./base-node.tsx";

interface InstagramProductTemplateNodeData {
  label: string;
  elements?: Array<{
    id: string;
  }>;
}

function InstagramProductTemplateNode(
  props: NodeProps & {
    data: InstagramProductTemplateNodeData;
    isConnectable: boolean;
  },
) {
  const { data, isConnectable } = props;
  const productCount = data.elements?.length || 0;

  return (
    <BaseNode {...props} icon={<IconShoppingCart size={18} />} color="#f97316">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="bg-orange-500!"
      />
      <div className="text-xs text-gray-500">
        {productCount} product{productCount !== 1 ? "s" : ""}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="bg-orange-500!"
      />
    </BaseNode>
  );
}

export default memo(InstagramProductTemplateNode);
