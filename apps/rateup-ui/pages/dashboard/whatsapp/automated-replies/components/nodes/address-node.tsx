import { memo } from "react";

import { Handle, Position } from "@xyflow/react";

import styles from "./node-styles.module.css";

const AddressNode = memo(
  ({ data, selected }: { data: any; selected: boolean }) => {
    return (
      <div
        className={`${styles.node} ${styles.addressNode} ${selected ? styles.selected : ""}`}
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
                  d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="9 22 9 12 15 12 15 22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.title}>{data.label || "Address"}</div>
          </div>

          <div className={styles.details}>
            {data.name && (
              <div className={styles.field}>
                <strong>Name:</strong> {data.name}
              </div>
            )}
            {data.street && (
              <div className={styles.field}>
                <strong>Street:</strong> {data.street}
              </div>
            )}
            {data.city && (
              <div className={styles.field}>
                <strong>City:</strong> {data.city}
              </div>
            )}
            {!data.name && !data.street && !data.city && (
              <div className={styles.placeholder}>Address details</div>
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

AddressNode.displayName = "AddressNode";

export default AddressNode;
