import { memo } from "react";

import type { NodeProps } from "@xyflow/react";

import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function EndNode({ data, id, selected }: NodeProps) {
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
      <line
        x1="15"
        y1="9"
        x2="9"
        y2="15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="9"
        y1="9"
        x2="15"
        y2="15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <BaseNode data={data} title="End" icon={icon} color="#f44336">
      <div className={styles.endContent}>
        {data.endMessage ? (
          <div className={styles.endMessage}>{data.endMessage}</div>
        ) : (
          <div className={styles.endPlaceholder}>Flow End Point</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(EndNode);
