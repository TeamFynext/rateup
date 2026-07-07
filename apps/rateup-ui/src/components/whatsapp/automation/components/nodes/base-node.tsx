import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";
import type React from "react";

import {
  BaseNode as UiBaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/ui/base-node.tsx";
import { NodeHeaderActions, NodeHeaderDeleteAction } from "@/components/ui/node-header.tsx";
import { cn } from "@/lib/utils.ts";

import { getNodeVisual } from "./node-config.tsx";

interface BaseNodeProps extends NodeProps {
  color?: string;
  children?: React.ReactNode;
  disableRight?: boolean;
  disableLeft?: boolean;
  invalid?: boolean;
}

function BaseNode({
  data,
  type,
  color,
  children,
  disableRight = false,
  disableLeft = false,
  invalid = false,
  selected,
  id,
}: Readonly<BaseNodeProps>) {
  const accent = color ?? getNodeVisual((data?.type as string) || type).color;

  const handleClass = "size-3.5! rounded-full! border-2! border-(--node-accent)! bg-card!";

  return (
    <UiBaseNode
      selected={selected}
      className={cn("group/node", invalid && "border-destructive ring-1 ring-destructive")}
      style={{ ["--node-accent" as string]: accent }}
    >
      <BaseNodeHeader>
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-xs"
          style={{ backgroundColor: "var(--node-accent)" }}
        />
        <BaseNodeHeaderTitle>{data.label as string}</BaseNodeHeaderTitle>
        <NodeHeaderActions className="opacity-0 transition-opacity group-hover/node:opacity-100 group-focus-within/node:opacity-100">
          <NodeHeaderDeleteAction id={id} />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent>{children}</BaseNodeContent>

      {!disableLeft && (
        <Handle type="target" position={Position.Left} id="left" className={handleClass} />
      )}
      {!disableRight && (
        <Handle type="source" position={Position.Right} id="right" className={handleClass} />
      )}
    </UiBaseNode>
  );
}

export default memo(BaseNode);
