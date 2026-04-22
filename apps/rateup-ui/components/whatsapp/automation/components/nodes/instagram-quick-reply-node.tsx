"use client";

import { memo, useMemo } from "react";

import { IconMessages } from "@tabler/icons-react";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { InstagramQuickReplyNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function InstagramQuickReplyNode(
  props: NodeProps & {
    data: InstagramQuickReplyNodeData;
    isConnectable: boolean;
  },
) {
  const { data } = props;

  // Ensure every quick reply has a stable ID for handles
  const quickReplies = useMemo(() => {
    return (data.quick_replies || []).map((reply, index) => ({
      ...reply,
      _handleId: reply.id || reply.payload || `qr_${index}`,
    }));
  }, [data.quick_replies]);

  return (
    <BaseNode
      {...props}
      icon={<IconMessages size={16} />}
      color="#ec4899"
      disableRight
    >
      <div className={styles.buttonContent}>
        {data.text && (
          <div className={styles.question}>{parseJsonToReact(data.text)}</div>
        )}

        <div className={styles.buttons}>
          {quickReplies.map((reply, index) => (
            <div key={reply._handleId} className={styles.button}>
              {reply.title || `Option ${index + 1}`}
              <Handle
                type="source"
                position={Position.Right}
                id={reply._handleId}
                className={styles.handle}
                style={{
                  border: `3px solid #ec4899`,
                  zIndex: 12,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(InstagramQuickReplyNode);
