import { memo } from "react";

import { Group, Text } from "@mantine/core";
import {
  IconFileDescription,
  IconImageInPicture,
  IconSquare,
  IconVideo,
} from "@tabler/icons-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { ButtonNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function ButtonNode(props: NodeProps & { data: ButtonNodeData }) {
  const { data } = props;

  // Determine header media content based on headerType
  const renderHeaderMedia = () => {
    switch (data.headerType) {
      case "video":
        return (
          <Group justify="center">
            <IconVideo size={24} />
          </Group>
        );
      case "image":
        return (
          <Group justify="center">
            <IconImageInPicture size={24} />
          </Group>
        );
      case "document":
        return (
          <>
            <Group justify="center">
              <IconFileDescription size={24} />
            </Group>
            <Text fz="xs">{data.filename}</Text>
          </>
        );
      case "text":
        return <Text fz="xs">{parseJsonToReact(data.header)}</Text>;
      default:
        return null;
    }
  };

  // Render buttons with handles (common across all types)
  const renderButtons = () => (
    <div className={styles.buttons}>
      {(data.buttons || []).map((button: any, index: number) => (
        <div key={index} className={styles.button}>
          {typeof button === "object" ? button.title : button}
          <Handle
            type="source"
            position={Position.Right}
            id={button?.id}
            className={styles.handle}
            style={{
              border: `3px solid #00bcd4`,
              zIndex: 12,
            }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <BaseNode
      {...props}
      icon={<IconSquare size={16} />}
      color="#00bcd4"
      disableRight
    >
      <div className={styles.buttonContent}>
        {renderHeaderMedia()}
        {data.caption && <Text fz="xs">{parseJsonToReact(data.caption)}</Text>}

        <div className={styles.question}>{parseJsonToReact(data.body)}</div>

        {data.footer && <Text fz="xs">{parseJsonToReact(data.footer)}</Text>}

        {renderButtons()}
      </div>
    </BaseNode>
  );
}

export default memo(ButtonNode);
