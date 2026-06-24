import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";

export interface VideoOptions {
  /**
   * HTML attributes to add to the video element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      /**
       * Add an video
       * @param options The video attributes
       * @example
       * editor
       *   .commands
       *   .setVideo({ src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', height:'200px',widht:'400px' })
       */
      setVideo: (options: { src: string; height?: number; width?: number }) => ReturnType;
    };
  }
}

/**
 * Matches an video tag.
 */
const inputRegex = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

export const Video = Node.create<VideoOptions>({
  name: "video",
  group: "block",

  addOptions() {
    return {
      inline: false,
      HTMLAttributes: {},
    };
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      height: {
        default: "auto",
      },
      width: {
        default: "100%",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes({ controls: "true" }, this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , src, height, width] = match;

          return { src, height, width };
        },
      }),
    ];
  },
});
