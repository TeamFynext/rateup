"use client";

import type React from "react";
import { useCallback } from "react";

import {
  IconAd,
  IconBuildingStore,
  IconExternalLink,
  IconFile,
  IconGitMerge,
  IconImageInPicture,
  IconInputSpark,
  IconLayout,
  IconMapPin,
  IconMenu,
  IconMusic,
  IconPlayCard,
  IconRobotFace,
  IconSquare,
  IconUser,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";

import { Card } from "@/components/ui/card";

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
      {
        id: "catalogNode",
        label: "Catalog",
        icon: <IconBuildingStore size={16} />,
      },
      {
        id: "textInputNode",
        label: "Input",
        icon: <IconInputSpark size={16} />,
      },
    ],
  },
  {
    name: "Location & Contacts",
    items: [
      { id: "locationNode", label: "Location", icon: <IconMapPin size={16} /> },
      // { id: "locationRequestNode", label: "Location Request", icon: <IconNavigation size={16} /> },
      { id: "contactsNode", label: "Contacts", icon: <IconUsers size={16} /> },
    ],
  },
  {
    name: "Flow Control",
    items: [
      {
        id: "flowNode",
        label: "WhatsApp Flow",
        icon: <IconGitMerge size={16} />,
      },
      // {
      //   id: "conditionalNode",
      //   label: "Condition",
      //   icon: <IconGitBranch size={16} />,
      // },
      // { id: "delayNode", label: "Delay", icon: <IconClock size={16} /> },
      { id: "startNode", label: "Start", icon: <IconPlayCard size={16} /> },
    ],
  },
  {
    name: "None Interactive",
    items: [
      { id: "ticketNode", label: "Ticket", icon: <IconGitMerge size={16} /> },
      { id: "aibotNode", label: "AI Bot", icon: <IconRobotFace size={16} /> },
      { id: "assignNode", label: "Assign", icon: <IconUser size={16} /> },
      { id: "leadgenNode", label: "Lead", icon: <IconAd size={16} /> },
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
    <Card className="w-[250px] overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Components</h2>
        <p className="text-sm text-muted-foreground">
          Drag components to the canvas
        </p>
      </div>

      {categories.map((category) => (
        <div key={category.name} className="mb-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {category.name}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {category.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center gap-1 rounded-md border bg-background p-3 cursor-move hover:bg-accent hover:text-accent-foreground transition-colors"
                role="none"
                draggable
                onDragStart={(event) =>
                  onDragStart(event, item.id, {
                    label: item.label,
                    type: item.id,
                  })
                }
              >
                <div className="text-muted-foreground">{item.icon}</div>
                <span className="text-xs text-center">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}
