import { memo } from "react";

import type { NodeProps } from "@xyflow/react";

import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function DelayNode({ data, id, selected }: NodeProps) {
  const icon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6v6l4 2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <BaseNode data={data} title="Delay" icon={icon} color="#607d8b">
      <div className={styles.delayContent}>
        <div className={styles.delayTime}>
          {data.delayTime ? `${data.delayTime} seconds` : "5 seconds"}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(DelayNode);
