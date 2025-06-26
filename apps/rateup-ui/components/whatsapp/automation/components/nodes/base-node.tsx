import { JSX, memo } from "react";
import type React from "react";

import { ActionIcon, Text } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";

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
  id,
}: BaseNodeProps) {
  const { hovered, ref } = useHover();
  const { deleteElements } = useReactFlow();

  return (
    <div
      ref={ref}
      className={`${styles.node}`}
      style={{
        borderLeft: `4px solid ${color}`,
        borderColor: color,
        boxShadow: selected ? `0 0 0 2px ${color}` : "none",
        backgroundColor: `${color}40`,
      }}
    >
      {hovered && (
        <ActionIcon
          color="red"
          // variant="subtle"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            deleteElements({ nodes: [{ id }] });
          }}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: 10,
          }}
          aria-label="Delete node"
        >
          <IconTrash size={16} />
        </ActionIcon>
      )}
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.icon}>{icon}</div>
          <Text className={styles.title} truncate={"end"}>
            {data.label as string}
          </Text>
        </div>

        <div className={styles.details}>{children}</div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={styles.handle}
        style={{
          border: `3px solid ${color}`,
        }}
      />
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
    </div>
  );
}

export default memo(BaseNode);
