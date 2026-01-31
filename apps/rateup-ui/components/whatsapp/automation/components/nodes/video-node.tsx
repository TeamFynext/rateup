import { memo } from "react";

import { IconVideo } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { MediaNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function VideoNode(props: NodeProps & { data: MediaNodeData }) {
  return (
    <BaseNode {...props} icon={<IconVideo size={16} />} color="#673ab7">
      <div className={styles.videoContent}>
        {props.data.link ? (
          <div className={styles.videoWrapper}>
            <div className={styles.videoPlaceholder}>
              <IconVideo size={24} />
            </div>
            {props.data.caption && (
              <div className={styles.caption}>
                {parseJsonToReact(props.data.caption)}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.videoPlaceholder}>
            <IconVideo size={24} />
            <span>Add Video URL</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(VideoNode);
