import React, { memo } from "react";

import { IconBuildingStore } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { CatalogNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

const CatalogNode = (props: NodeProps & { data: CatalogNodeData }) => {
  return (
    <BaseNode
      {...props}
      icon={<IconBuildingStore size={16} />}
      color="#ac2195ff"
    >
      <div className={styles.textContent}>
        {props.data?.body
          ? parseJsonToReact(props?.data.body)
          : "Double-click to edit message"}
      </div>
    </BaseNode>
  );
};

export default memo(CatalogNode);
