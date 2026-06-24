import { memo } from "react";

import { IconDeviceAudioTape } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";

import type { MediaNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";
import styles from "./node-styles.module.css";

function AudioNode(props: NodeProps & { data: MediaNodeData }) {
  const { data } = props;

  return (
    <BaseNode
      {...props}
      icon={<IconDeviceAudioTape size={16} />}
      color="#ff5722"
    >
      <div className={styles.audioContent}>
        {data.link ? (
          <div className={styles.audioWrapper}>
            <div className={styles.audioPlaceholder}>
              <IconDeviceAudioTape size={24} />
            </div>
            {data.caption && (
              <div className={styles.caption}>
                {parseJsonToReact(data.caption)}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.audioPlaceholder}>
            <IconDeviceAudioTape size={24} />
            <span>Add Audio URL</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(AudioNode);
