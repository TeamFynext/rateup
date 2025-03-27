"use client";

import type React from "react";
import { memo, useState } from "react";
import type { JSX } from "react/jsx-runtime";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import styles from "./node-styles.module.css";

function GroupNode({ data }: NodeProps) {
  const [text, setText] = useState(
    'I am an intelligent AI assistant. I am here to assist you with any questions related to "Libromi Connect".\n\n*Feel free to ask me anything.*',
  );
  const [charCount, setCharCount] = useState(140);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setCharCount(newText.length);
  };

  return (
    <div className={styles.groupNode}>
      <div className={styles.groupNodeHeader}>
        Group #
        {data.label === "Text" ? "1" : Math.floor(Math.random() * 10) + 1}
      </div>

      {data.type === "text" && (
        <div className={styles.textEditor}>
          <div className={styles.toolbar}>
            <button className={styles.toolbarButton}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className={styles.toolbarButton}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className={styles.toolbarButton}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 4h4M10 20h4M8 9h8M8 15h8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <textarea
            className={styles.textArea}
            value={text}
            onChange={handleTextChange}
          />
          <div className={styles.charCount}>{charCount}/1024</div>
        </div>
      )}

      {data.type !== "text" && (
        <div className={styles.componentPlaceholder}>
          <div className={styles.componentIcon}>
            {getComponentIcon(data.type)}
          </div>
          <span>{data.label} Component</span>
        </div>
      )}

      {/* Left handle for target connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: "#555", width: "8px", height: "8px" }}
      />

      {/* Top handle for target connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: "#555", width: "8px", height: "8px" }}
      />

      {/* Right handle for source connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: "#555", width: "8px", height: "8px" }}
      />

      {/* Bottom handle for source connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: "#555", width: "8px", height: "8px" }}
      />
    </div>
  );
}

function getComponentIcon(type: string) {
  // Simple function to return an icon based on component type
  const iconMap: Record<string, JSX.Element> = {
    image: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          ry="2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="8.5"
          cy="8.5"
          r="1.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 15l-5-5L5 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    video: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="2.18"
          ry="2.18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 8l6 4-6 4V8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    "quick-reply": (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    list: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="8"
          y1="6"
          x2="21"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="8"
          y1="12"
          x2="21"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="8"
          y1="18"
          x2="21"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="3"
          y1="6"
          x2="3.01"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="3"
          y1="12"
          x2="3.01"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="3"
          y1="18"
          x2="3.01"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    default: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  return iconMap[type] || iconMap["default"];
}

export default memo(GroupNode);
