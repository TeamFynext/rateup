import { memo } from "react";

import { IconLocationSearch } from "@tabler/icons-react";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { LocationRequestNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function LocationRequestNode(
  props: NodeProps & { data: LocationRequestNodeData },
) {
  const { data } = props;
  return (
    <BaseNode
      {...props}
      icon={<IconLocationSearch size={16} />}
      color="#f59e0b"
    >
      slfjk
    </BaseNode>
  );
}

export default memo(LocationRequestNode);
