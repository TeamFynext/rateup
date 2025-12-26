import Image from "@tiptap/extension-image";

import { uploadFile } from "@/components/Linktree/LinktreeEditor/ThemeEditor/components/SaveChangesBtn/uploadFile";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    CustomImageExtension: {
      /**
       * Comments will be added to the autocomplete.
       */
      setImage: (someProp: any) => ReturnType;
    };
  }
}

const CustomImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: `object-fit: contain;max-width: 100%;`,
      },
    };
  },
  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
  parseHTML() {
    return [
      {
        tag: "img",
        getAttrs: (element) => {
          return {
            style: element.getAttribute("style"),
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", HTMLAttributes];
  },
});

export default CustomImageExtension;
