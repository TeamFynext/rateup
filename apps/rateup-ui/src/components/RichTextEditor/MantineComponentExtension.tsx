import { Badge } from "@mantine/core";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

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

const VariableComponent = ({ node, updateAttributes }) => {
  return (
    <NodeViewWrapper as={"span"}>
      <Badge variant="light" radius={"sm"}>
        {node.attrs.label || "Default Label"}
      </Badge>
    </NodeViewWrapper>
  );
};

export const VariableComponentExtension = MantineComponentExtension({
  MantineComponent: VariableComponent,
  componentName: "variable-component",
});

export default MantineComponentExtension;
