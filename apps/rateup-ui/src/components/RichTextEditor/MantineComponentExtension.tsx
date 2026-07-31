import { Node } from "@tiptap/core";
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge.tsx";

const MantineComponentExtension = ({
  MantineComponent,
  componentName,
}: {
  MantineComponent: ComponentType<ReactNodeViewProps<HTMLElement>>;
  componentName: string;
}) => {
  return Node.create({
    name: "mantineComponent",

    group: "inline",

    inline: true,

    atom: true,

    addAttributes() {
      return {
        label: {
          default: "Default Label",
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: componentName,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return [componentName, HTMLAttributes];
    },

    addNodeView() {
      return ReactNodeViewRenderer(MantineComponent);
    },
  });
};

const VariableComponent = ({ node }: ReactNodeViewProps<HTMLElement>) => {
  return (
    <NodeViewWrapper as={"span"}>
      <Badge variant="system" className="rounded-sm">
        {node.attrs.label || "Default Label"}
      </Badge>
    </NodeViewWrapper>
  );
};

export const VariableComponentExtension = MantineComponentExtension({
  MantineComponent: VariableComponent,
  componentName: "variable-component",
});
