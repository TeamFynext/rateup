import { memo } from "react";

import { IconMessageCircle } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { QuickReplyNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function QuickReplyNode(props: NodeProps & { data: QuickReplyNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconMessageCircle size={16} />} color="#2196f3">
      <div className={styles.quickReplyContent}>
        <div className={styles.question}>
          {data.question || "Question text"}
        </div>
        <div className={styles.options}>
          {data.options.map((option, index) => (
            <div key={index} className={styles.option}>
              {typeof option === "object" ? option : option}
            </div>
          ))}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(QuickReplyNode);
