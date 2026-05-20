import { memo } from "react";

import { IconFileDescription } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import type { DocumentNodeData } from "../../types/node-types.ts";

import BaseNode from "./base-node.tsx";
import styles from "./node-styles.module.css";

function DocumentNode(props: NodeProps & { data: DocumentNodeData }) {
  const { data } = props;
  return (
    <BaseNode
      {...props}
      icon={<IconFileDescription size={16} />}
      color="#795548"
    >
      <div className={styles.documentContent}>
        {data.link ? (
          <div className={styles.documentWrapper}>
            <div className={styles.documentPlaceholder}>
              <IconFileDescription size={24} />
              <span>{data.filename || "Document"}</span>
            </div>
          </div>
        ) : (
          <div className={styles.documentPlaceholder}>
            <IconFileDescription size={24} />
            <span>Add Document</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(DocumentNode);
