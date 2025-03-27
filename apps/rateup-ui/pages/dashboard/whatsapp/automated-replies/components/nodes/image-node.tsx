import { memo } from "react";

import { Image } from "@mantine/core";
import { IconImageInPicture } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { ImageNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function ImageNode(props: NodeProps & { data: ImageNodeData }) {
  const { data } = props;
  return (
    <BaseNode
      {...props}
      icon={<IconImageInPicture size={16} />}
      color="#9c27b0"
    >
      <div className={styles.imageContent}>
        {data.link ? (
          <div className={styles.imageWrapper}>
            <Image
              src={data.link || "/placeholder.svg"}
              alt={data.caption || "Image"}
            />
            {data.caption && (
              <div className={styles.caption}>{data.caption}</div>
            )}
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <IconImageInPicture size={24} />
            <span>Add Image URL</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(ImageNode);
