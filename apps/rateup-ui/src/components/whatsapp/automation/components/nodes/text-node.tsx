import { IconMessage } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";

import type { TextNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

import styles from "./node-styles.module.css";

function TextNode(props: NodeProps & { data: TextNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconMessage size={16} />} color="#3f51b5">
      <div className={styles.textContent}>
        {data.body ? parseJsonToReact(data.body) : "Double-click to edit message"}
      </div>
    </BaseNode>
  );
}

export default memo(TextNode);
