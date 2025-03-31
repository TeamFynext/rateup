import { memo } from "react";

import { IconInputAi } from "@tabler/icons-react";
import type { NodeProps } from "@xyflow/react";

import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function InputNode(props: NodeProps) {
  const { data, type } = props;
  // Determine input type from node type
  const nodeType = data.type || type;
  let inputType = "Text";
  let color = "#3f51b5";

  switch (nodeType) {
    case "numberInputNode":
      inputType = "Number";
      color = "#e91e63";
      break;
    case "emailInputNode":
      inputType = "Email";
      color = "#009688";
      break;
    case "phoneInputNode":
      inputType = "Phone";
      color = "#795548";
      break;
    case "dateInputNode":
      inputType = "Date";
      color = "#607d8b";
      break;
    default:
      inputType = "Text";
      color = "#3f51b5";
  }

  return (
    <BaseNode {...props} icon={<IconInputAi size={16} />} color={color}>
      <div className={styles.inputContent}>
        {/* <div className={styles.question}>
          {data.question || "Enter your question"}
        </div>
        {data.variableName && (
          <div className={styles.variable}>Variable: {data.variableName}</div>
        )} */}
      </div>
    </BaseNode>
  );
}

export default memo(InputNode);
