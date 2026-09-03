import {
  IconAd,
  IconBuildingStore,
  IconClockPause,
  IconExternalLink,
  IconFile,
  IconGitMerge,
  IconImageInPicture,
  IconComponents,
  IconInputSpark,
  IconLayout,
  IconMapPin,
  IconMenu,
  IconMusic,
  IconPlayCard,
  IconSquare,
  IconUser,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import type React from "react";
import { useCallback } from "react";

import type { AutomationPlatform } from "@/types/platform.ts";
import { isComponentSupportedOnPlatform } from "@/types/platform.ts";

import { FlowPanel } from "./flow-panel.tsx";
import { getNodeVisual } from "./nodes/node-config.tsx";

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
        id: "instagramProductTemplateNode",
        label: "Product Template",
        icon: <IconBuildingStore size={16} />,
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
      { id: "assignNode", label: "Assign", icon: <IconUser size={16} /> },
      { id: "leadgenNode", label: "Lead", icon: <IconAd size={16} /> },
    ],
  },
];

export default function ComponentSidebar({ platform }: Readonly<{ platform: string }>) {
  const selectedPlatform = platform as AutomationPlatform;

  // Function to get default node data based on node type. The visible label is
  // filled in on drop from the shared node-config, so nodes get friendly names.
  const getDefaultNodeData = useCallback((nodeId: string): Record<string, unknown> => {
    const baseData = { type: nodeId };

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
    (event: React.DragEvent, nodeType: string, nodeData: Record<string, unknown>) => {
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
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          isComponentSupportedOnPlatform(item.id, selectedPlatform),
        ),
      }))
      .filter((category) => category.items.length > 0);
  };

  const filteredCategories = getFilteredCategories();

  return (
    <FlowPanel side="right" title="Components" icon={<IconComponents size={18} />} collapsible>
      <div className="flex flex-col gap-5">
        {filteredCategories.map((category) => (
          <div key={category.name} className="flex flex-col gap-1.5">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category.name}
            </h3>
            {category.items.map((item) => {
              const accent = getNodeVisual(item.id).color;
              return (
                <div
                  key={item.id}
                  className="group flex cursor-grab items-center gap-3 rounded-lg border border-transparent bg-background p-2.5 transition-colors hover:border-border hover:bg-accent active:cursor-grabbing"
                  role="none"
                  draggable
                  onDragStart={(event) => onDragStart(event, item.id, getDefaultNodeData(item.id))}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
                      color: accent,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </FlowPanel>
  );
}
