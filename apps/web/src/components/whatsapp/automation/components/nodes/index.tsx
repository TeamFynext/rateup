import { NODE_VISUALS } from "./node-config.tsx";
import GenericNode from "./node.tsx";

// Every node type renders through the single data-driven GenericNode.
export const nodeTypes = Object.fromEntries(
  Object.keys(NODE_VISUALS).map((type) => [type, GenericNode]),
) as Record<string, typeof GenericNode>;
