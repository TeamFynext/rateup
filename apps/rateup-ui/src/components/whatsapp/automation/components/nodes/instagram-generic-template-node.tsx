"use client";

import { memo, useMemo } from "react";

import { IconCards } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";

import type { InstagramGenericTemplateNodeData } from "../../types/node-types.ts";

import BaseNode from "./base-node.tsx";
import styles from "./node-styles.module.css";

function InstagramGenericTemplateNode(
  props: NodeProps & {
    data: InstagramGenericTemplateNodeData;
    isConnectable: boolean;
  },
) {
  const { data } = props;

  // Collect all postback buttons across all cards for per-option handles
  const postbackButtons = useMemo(() => {
    const buttons: Array<{
      title: string;
      _handleId: string;
      cardIndex: number;
      btnIndex: number;
    }> = [];
    (data.elements || []).forEach((element, cardIndex) => {
      (element.buttons || []).forEach((button, btnIndex) => {
        if (button.type === "postback") {
          buttons.push({
            title: button.title,
            _handleId:
              button.id || button.payload || `btn_${cardIndex}_${btnIndex}`,
            cardIndex,
            btnIndex,
          });
        }
      });
    });
    return buttons;
  }, [data.elements]);

  const elementCount = data.elements?.length || 0;

  return (
    <BaseNode
      {...props}
      icon={<IconCards size={16} />}
      color="#a855f7"
      disableRight
    >
      <div className={styles.buttonContent}>
        <div className={styles.question}>
          {elementCount} card{elementCount !== 1 ? "s" : ""}
        </div>

        {postbackButtons.length > 0 && (
          <div className={styles.buttons}>
            {postbackButtons.map((button) => (
              <div key={button._handleId} className={styles.button}>
                {button.title || `Button`}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={button._handleId}
                  className={styles.handle}
                  style={{
                    border: `3px solid #a855f7`,
                    zIndex: 12,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(InstagramGenericTemplateNode);
