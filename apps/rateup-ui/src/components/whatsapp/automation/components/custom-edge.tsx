import { IconX } from "@tabler/icons-react";
import { getBezierPath, useReactFlow } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

import { ButtonEdge, ButtonEdgeButton } from "@/components/ui/button-edge.tsx";

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <ButtonEdge
      path={edgePath}
      labelX={labelX}
      labelY={labelY}
      markerEnd={markerEnd}
      // Force the primary colour, overriding any per-edge stroke saved in older flows.
      style={{ ...style, stroke: "var(--primary)" }}
    >
      <ButtonEdgeButton
        aria-label="Delete connection"
        onClick={() => void deleteElements({ edges: [{ id }] })}
      >
        <IconX />
      </ButtonEdgeButton>
    </ButtonEdge>
  );
}
