import { memo } from "react";

import { IconPlayerPlay } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { StartNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function StartNode(props: NodeProps & { data: StartNodeData }) {
  return (
    <BaseNode {...props} icon={<IconPlayerPlay size={16} />} color="#4caf50">
      <div className={styles.startContent}>
        {props.data.startMessage ? (
          <div className={styles.startMessage}>{props.data.startMessage}</div>
        ) : (
          <div className={styles.startPlaceholder}>Flow Start Point</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(StartNode);
