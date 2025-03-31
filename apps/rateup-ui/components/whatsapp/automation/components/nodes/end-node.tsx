import { memo } from "react";

import { IconX } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { EndNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function EndNode(props: NodeProps & { data: EndNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconX size={16} />} color="#f44336">
      <div className={styles.endContent}>
        {data.endMessage ? (
          <div className={styles.endMessage}>{data.endMessage}</div>
        ) : (
          <div className={styles.endPlaceholder}>Flow End Point</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(EndNode);
