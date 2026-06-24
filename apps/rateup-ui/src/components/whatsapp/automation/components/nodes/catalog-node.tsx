import { IconBuildingStore } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import React, { memo } from "react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";

import type { CatalogNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

import styles from "./node-styles.module.css";

const CatalogNode = (props: NodeProps & { data: CatalogNodeData }) => {
  return (
    <BaseNode {...props} icon={<IconBuildingStore size={16} />} color="#ac2195ff">
      <div className={styles.textContent}>
        {props.data?.body ? parseJsonToReact(props?.data.body) : "Double-click to edit message"}
      </div>
    </BaseNode>
  );
};

export default memo(CatalogNode);
