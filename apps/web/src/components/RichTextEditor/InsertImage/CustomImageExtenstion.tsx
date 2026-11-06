import Image from "@tiptap/extension-image";

const CustomImageExtension = Image.extend({
  name: "image",

  inline: false,
  group: "block",

  addAttributes() {
    return {
      ...this.parent?.(),

      style: {
        default: "object-fit: contain; max-width: 100%;",
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return {
            style: attributes.style,
          };
        },
      },

      "data-align": {
        default: null, // ⚠️ IMPORTANT (not "center")
        parseHTML: (element) => element.getAttribute("data-align"),
        renderHTML: (attributes) => {
          if (!attributes["data-align"]) return {};
          return {
            "data-align": attributes["data-align"],
          };
        },
      },
    };
  },
});

export default CustomImageExtension;
