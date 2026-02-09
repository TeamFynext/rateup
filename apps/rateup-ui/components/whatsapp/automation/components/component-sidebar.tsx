"use client";

import type React from "react";
import { useCallback } from "react";

import {
  IconAd,
  IconBuildingStore,
  IconClockPause,
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

import {
  AutomationPlatform,
  isComponentSupportedOnPlatform,
} from "@/types/platform";
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
    name: "Instagram Templates",
    items: [
      {
        id: "instagramGenericTemplateNode",
        label: "Generic Template",
        icon: <IconLayout size={16} />,
      },
      {
        id: "instagramQuickReplyNode",
        label: "Quick Reply",
        icon: <IconSquare size={16} />,
      },
      {
        id: "instagramStoryReplyNode",
        label: "Story Reply",
        icon: <IconImageInPicture size={16} />,
      },
      {
        id: "instagramProductTemplateNode",
        label: "Product Template",
        icon: <IconBuildingStore size={16} />,
      },
      {
        id: "instagramIceBreakerNode",
        label: "Ice Breaker",
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

      { id: "pauseNode", label: "Pause", icon: <IconClockPause size={16} /> },
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

export default function ComponentSidebar({ platform }: { platform: string }) {
  const selectedPlatform = platform as AutomationPlatform;

  // Debug log to verify platform
  console.log(
    "[ComponentSidebar] Received platform:",
    platform,
    "Parsed as:",
    selectedPlatform,
  );

  // Function to get default node data based on node type
  const getDefaultNodeData = useCallback((nodeId: string, label: string) => {
    const baseData = { label, type: nodeId };

    switch (nodeId) {
      case "instagramGenericTemplateNode":
        return {
          ...baseData,
          elements: [
            {
              title: "",
              subtitle: "",
              image_url: "",
              buttons: [],
            },
          ],
        };
      case "instagramQuickReplyNode":
        return {
          ...baseData,
          text: "",
          quick_replies: [],
        };
      case "instagramStoryReplyNode":
        return {
          ...baseData,
          text: "",
          story_mention: false,
        };
      case "instagramProductTemplateNode":
        return {
          ...baseData,
          elements: [],
        };
      case "instagramIceBreakerNode":
        return {
          ...baseData,
          iceBreakers: [],
        };
      default:
        return baseData;
    }
  }, []);

  // Function to handle drag start
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, nodeData: any) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.setData(
        "application/nodeData",
        JSON.stringify({ ...nodeData, platform: selectedPlatform }),
      );
      event.dataTransfer.effectAllowed = "move";
    },
    [selectedPlatform],
  );

  // Filter categories based on selected platform
  const getFilteredCategories = () => {
    const filtered = categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const isSupported = isComponentSupportedOnPlatform(
            item.id,
            selectedPlatform,
          );
          console.log(
            `[Filter] ${item.id} on ${selectedPlatform}:`,
            isSupported,
          );
          return isSupported;
        }),
      }))
      .filter((category) => category.items.length > 0);

    console.log(
      "[ComponentSidebar] Filtered categories:",
      filtered.length,
      "Total items:",
      filtered.reduce((sum, cat) => sum + cat.items.length, 0),
    );
    return filtered;
  };

  const filteredCategories = getFilteredCategories();

  return (
    <Card className="w-62.5 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Components</h2>
        <p className="text-sm text-muted-foreground">
          Drag components to the canvas
        </p>
      </div>

      {filteredCategories.map((category) => (
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
                  onDragStart(
                    event,
                    item.id,
                    getDefaultNodeData(item.id, item.label),
                  )
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
