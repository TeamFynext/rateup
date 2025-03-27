import { memo } from "react";

import type { NodeProps } from "@xyflow/react";

import BaseNode from "./base-node";
import styles from "./node-styles.module.css";

function InputNode({ data, id, selected, type }: NodeProps) {
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

  const icon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7V4h16v3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4v16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <BaseNode
      data={data}
      title={`${inputType} Input`}
      icon={icon}
      color={color}
    >
      <div className={styles.inputContent}>
        <div className={styles.question}>
          {data.question || "Enter your question"}
        </div>
        {data.variableName && (
          <div className={styles.variable}>Variable: {data.variableName}</div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(InputNode);
