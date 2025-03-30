import { memo } from "react";

import { IconClock } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { DelayNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function DelayNode(props: NodeProps & { data: DelayNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconClock size={16} />} color="#607d8b">
      <div className={styles.delayContent}>
        <div className={styles.delayTime}>
          {data.delayTime ? `${data.delayTime} seconds` : "5 seconds"}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(DelayNode);
