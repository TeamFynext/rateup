import { Image } from "@mantine/core";
import { IconImageInPicture } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import type { ImageNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

import styles from "./node-styles.module.css";

function ImageNode(props: NodeProps & { data: ImageNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconImageInPicture size={16} />} color="#9c27b0">
      <div className={styles.imageContent}>
        {data.link ? (
          <div className={styles.imageWrapper}>
            <Image
              src={getFileUrlFromKey(data.link) || "/placeholder.svg"}
              alt={"Image"}
              mah={500}
            />
            {data.caption && <div className={styles.caption}>{parseJsonToReact(data.caption)}</div>}
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
