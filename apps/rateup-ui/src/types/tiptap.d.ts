import "@tiptap/core";

declare module "@tiptap/core" {
  interface SetImageOptions {
    style?: string;
    src: string;
    "data-align"?: string;
  }
}
