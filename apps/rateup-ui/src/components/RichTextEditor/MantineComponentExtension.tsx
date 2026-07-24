import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import { Badge } from "@/components/ui/badge.tsx";

const MantineComponentExtension = ({ MantineComponent, componentName }) => {
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

const VariableComponent = ({ node }) => {
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
