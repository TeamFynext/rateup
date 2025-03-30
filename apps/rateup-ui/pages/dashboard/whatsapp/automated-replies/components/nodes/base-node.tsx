import { memo } from "react";
import type React from "react";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import styles from "./node-styles.module.css";

interface BaseNodeProps extends NodeProps {
  icon?: JSX.Element;
  color?: string;
  children?: React.ReactNode;
  disableRight?: boolean;
}

function BaseNode({
  data,
  icon,
  color = "#6366f1",
  children,
  disableRight = false,
  selected,
}: BaseNodeProps) {
  return (
    <div
      className={`${styles.node}`}
      style={{
        borderLeft: `4px solid ${color}`,
        borderColor: color,
        boxShadow: selected ? `0 0 0 2px ${color}` : "none",
        backgroundColor: `${color}40`,
      }}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.icon}>{icon}</div>
          <div className={styles.title}>{data.label as string}</div>
        </div>

        <div className={styles.details}>{children}</div>
      </div>

      {/* Connection handles on all sides */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={styles.handle}
        style={{
          border: `3px solid ${color}`,
        }}
      />
      {/* <Handle type="target" position={Position.Top} id="top" style={{ background: "#555" }} /> */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={styles.handle}
        style={{
          display: disableRight ? "none" : "block",
          border: `3px solid ${color}`,
        }}
      />
      {/* <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: "#555" }} /> */}
    </div>
  );
}

export default memo(BaseNode);
