import { Mark, mergeAttributes } from "@tiptap/core";

import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    align: {
      setAlign: (alignment: string) => ReturnType;
    };
  }
}
export const Align = Mark.create({
  name: "align",

  addAttributes() {
    return {
      textAlign: {
        default: "left",
        parseHTML: (element) => element.style.textAlign || "left",
        renderHTML: (attributes) => {
          return {
            style: `text-align: ${attributes.textAlign}; display: block`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        style: "text-align",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setAlign:
        (alignment: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { textAlign: alignment });
        },
    };
  },
});
