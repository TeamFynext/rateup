import { memo } from "react";

import { Text } from "@mantine/core";
import { IconGitBranch, IconRobotFace } from "@tabler/icons-react";
import { NodeProps } from "@xyflow/react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor";

import { AiBotNodeData, FlowNodeData } from "../../types/node-types";
import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function AiBotNode(props: NodeProps & { data: AiBotNodeData }) {
  const { data } = props;
  return (
    <BaseNode {...props} icon={<IconRobotFace size={16} />} color="#ef4444">
      {/* <div className={styles.textContent}>
        {data.body
          ? parseJsonToReact(data.body)
          : "Double-click to edit message"}
      </div> */}
      <Text>{data?.flow?.name}</Text>
    </BaseNode>
  );
}

export default memo(AiBotNode);
