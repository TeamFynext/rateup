import { memo } from "react";

import { Handle, Position } from "@xyflow/react";

import styles from "./node-styles.module.css";

const StickerNode = memo(
  ({ data, selected }: { data: any; selected: boolean }) => {
    return (
      <div
        className={`${styles.node} ${styles.stickerNode} ${selected ? styles.selected : ""}`}
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
                <path
                  d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 3v6h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 16s.8-1 2-1 2.2 1 4 1 2-1 2-1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.title}>{data.label || "Sticker"}</div>
          </div>

          <div className={styles.details}>
            {data.stickerId ? (
              <div className={styles.field}>Sticker ID: {data.stickerId}</div>
            ) : (
              <div className={styles.placeholder}>Sticker details</div>
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

StickerNode.displayName = "StickerNode";

export default StickerNode;
