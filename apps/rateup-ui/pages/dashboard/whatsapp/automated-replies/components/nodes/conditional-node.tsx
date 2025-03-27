import { memo } from "react";

import type { NodeProps } from "@xyflow/react";

import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function ConditionalNode({ data, id, selected }: NodeProps) {
  const icon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 3v12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="18"
        cy="6"
        r="3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="6"
        cy="18"
        r="3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 9a9 9 0 0 1-9 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <BaseNode data={data} title="Condition" icon={icon} color="#ff9800">
      <div className={styles.conditionalContent}>
        <div className={styles.condition}>
          {data.condition || "Define condition"}
        </div>
        <div className={styles.branches}>
          <div className={styles.trueBranch}>True</div>
          <div className={styles.falseBranch}>False</div>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(ConditionalNode);
