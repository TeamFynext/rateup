import { memo } from "react";

import { IconMessage } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { TextNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function TextNode(props: NodeProps & { data: TextNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconMessage size={16} />} color="#3f51b5">
      <div className={styles.textContent}>
        {data.body
          ? parseJsonToReact(data.body)
          : "Double-click to edit message"}
      </div>
    </BaseNode>
  );
}

export default memo(TextNode);
