import { IconInputSpark } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { parseJsonToReact } from "@/components/RichTextEditor/waTextEditor.tsx";

import type { InputNodeData } from "../../types/node-types.ts";
import BaseNode from "./base-node.tsx";

import styles from "./node-styles.module.css";

function InputNode(props: NodeProps & { data: InputNodeData }) {
  const { data, type } = props;
  // Determine input type from node type
  const nodeType = data.type || type;
  let _inputType = "Text";
  let color = "#3f51b5";

  switch (nodeType) {
    case "numberInputNode":
      _inputType = "Number";
      color = "#e91e63";
      break;
    case "emailInputNode":
      _inputType = "Email";
      color = "#009688";
      break;
    case "phoneInputNode":
      _inputType = "Phone";
      color = "#795548";
      break;
    case "dateInputNode":
      _inputType = "Date";
      color = "#607d8b";
      break;
    default:
      _inputType = "Text";
      color = "#3f51b5";
  }

  return (
    <BaseNode {...props} icon={<IconInputSpark size={16} />} color={color}>
      <div className={styles.inputContent}>
        <div className={styles.question}>
          {data.question ? parseJsonToReact(data.question) : "Double-click to edit question"}
        </div>
        {data.variableName && <div className={styles.variable}>Variable: {data.variableName}</div>}
      </div>
    </BaseNode>
  );
}

export default memo(InputNode);
