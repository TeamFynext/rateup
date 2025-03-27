import { memo } from "react";

import { Handle, Position } from "@xyflow/react";

import styles from "./node-styles.module.css";

const ReactionNode = memo(
  ({ data, selected }: { data: any; selected: boolean }) => {
    return (
      <div
        className={`${styles.node} ${styles.reactionNode} ${selected ? styles.selected : ""}`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className={styles.handle}
        />

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.icon}>
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
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 14s1.5 2 4 2 4-2 4-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="9"
                  y1="9"
                  x2="9.01"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="15"
                  y1="9"
                  x2="15.01"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.title}>{data.label || "Reaction"}</div>
          </div>

          <div className={styles.details}>
            {data.emoji ? (
              <div className={styles.field}>Emoji: {data.emoji}</div>
            ) : (
              <div className={styles.placeholder}>Reaction emoji</div>
            )}
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className={styles.handle}
        />
      </div>
    );
  },
);

ReactionNode.displayName = "ReactionNode";

export default ReactionNode;
