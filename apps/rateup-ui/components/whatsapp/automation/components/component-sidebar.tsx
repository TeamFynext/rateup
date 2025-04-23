"use client";

import type React from "react";
import { useCallback } from "react";

import {
  IconClock,
  IconExternalLink,
  IconFile,
  IconGitMerge,
  IconImageInPicture,
  IconLayout,
  IconMapPin,
  IconMenu,
  IconMusic,
  IconPlayCard,
  IconRobot,
  IconRobotFace,
  IconSquare,
  IconUsers,
  IconVideo,
  IconX,
} from "@tabler/icons-react";

import styles from "./component-sidebar.module.css";

// Component categories and items
const categories = [
  {
    name: "Basic Messages",
    items: [
      { id: "textNode", label: "Text", icon: <IconSquare size={16} /> },
      {
        id: "imageNode",
        label: "Image",
        icon: <IconImageInPicture size={16} />,
      },
      { id: "videoNode", label: "Video", icon: <IconVideo size={16} /> },
      { id: "audioNode", label: "Audio", icon: <IconMusic size={16} /> },
      { id: "documentNode", label: "Document", icon: <IconFile size={16} /> },
      // { id: "stickerNode", label: "Sticker", icon: <IconSticker size={16} /> },
    ],
  },
  {
    name: "Interactive",
    items: [
      {
        id: "buttonNode",
        label: "Reply Buttons",
        icon: <IconSquare size={16} />,
      },
      { id: "listNode", label: "List", icon: <IconMenu size={16} /> },
      {
        id: "ctaUrlNode",
        label: "Call-To-Action URL",
        icon: <IconExternalLink size={16} />,
      },
      { id: "templateNode", label: "Template", icon: <IconLayout size={16} /> },
      // { id: "reactionNode", label: "Reaction", icon: <IconSmile size={16} /> },
    ],
  },
  {
    name: "Location & Contacts",
    items: [
      { id: "locationNode", label: "Location", icon: <IconMapPin size={16} /> },
      // { id: "locationRequestNode", label: "Location Request", icon: <IconNavigation size={16} /> },
      // { id: "addressNode", label: "Address", icon: <IconHome size={16} /> },
      { id: "contactsNode", label: "Contacts", icon: <IconUsers size={16} /> },
    ],
  },
  {
    name: "Flow Control",
    items: [
      { id: "flowNode", label: "Flow", icon: <IconGitMerge size={16} /> },
      // {
      //   id: "conditionalNode",
      //   label: "Condition",
      //   icon: <IconGitBranch size={16} />,
      // },
      // { id: "delayNode", label: "Delay", icon: <IconClock size={16} /> },
      { id: "startNode", label: "Start", icon: <IconPlayCard size={16} /> },
      { id: "endNode", label: "End", icon: <IconX size={16} /> },
    ],
  },
  {
    name: "None Interactive",
    items: [
      { id: "ticketNode", label: "Ticket", icon: <IconGitMerge size={16} /> },
      { id: "aibotNode", label: "AiBot", icon: <IconRobotFace size={16} /> },
    ],
  },
];

export default function ComponentSidebar() {
  // Function to handle drag start
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, nodeData: any) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.setData(
        "application/nodeData",
        JSON.stringify(nodeData),
      );
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2>Components</h2>
        <p>Drag components to the canvas</p>
      </div>

      {categories.map((category) => (
        <div key={category.name} className={styles.category}>
          <h3 className={styles.categoryTitle}>{category.name}</h3>
          <div className={styles.itemsGrid}>
            {category.items.map((item) => (
              <div
                key={item.id}
                className={styles.item}
                draggable
                onDragStart={(event) =>
                  onDragStart(event, item.id, {
                    label: item.label,
                    type: item.id,
                  })
                }
              >
                <div className={styles.itemIcon}>{item.icon}</div>
                <span className={styles.itemLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
