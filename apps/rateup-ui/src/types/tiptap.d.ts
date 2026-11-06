import "@tiptap/core";

declare module "@tiptap/core" {
  interface SetImageOptions {
    style?: string;
    src: string;
    alt?: string;
    title?: string;
    "data-align"?: string;
  }
}
