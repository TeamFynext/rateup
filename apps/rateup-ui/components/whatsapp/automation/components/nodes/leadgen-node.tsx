import React, { memo } from "react";

import { IconBrandMeta } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { LeadgenNodeData } from "../../types/node-types";
import BaseNode from "./base-node";

const LeadgenNode = (props: NodeProps & { data: LeadgenNodeData }) => {
  return (
    <BaseNode {...props} icon={<IconBrandMeta size={16} />} color="#81b1ff">
      {props?.data?.ad && <p>Ad: {props?.data?.ad?.name}</p>}
    </BaseNode>
  );
};

export default memo(LeadgenNode);
