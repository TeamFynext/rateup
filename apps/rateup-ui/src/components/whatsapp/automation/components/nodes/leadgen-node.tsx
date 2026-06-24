import React, { memo } from "react";

import { IconBrandMeta } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import type { LeadgenNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

const LeadgenNode = (props: NodeProps & { data: LeadgenNodeData }) => {
  return (
    <BaseNode {...props} icon={<IconBrandMeta size={16} />} color="#81b1ff">
      {props?.data?.ad && <p>Ad: {props?.data?.ad?.name}</p>}
    </BaseNode>
  );
};

export default memo(LeadgenNode);
