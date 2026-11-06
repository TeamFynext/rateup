/**
 * `tiptap-markdown` registers itself on the editor's storage at runtime but ships its
 * declaration for tiptap v2, so v3's `Storage` interface does not pick it up. Declare the
 * one member the editors read.
 */
declare module "@tiptap/core" {
  interface Storage {
    markdown: {
      getMarkdown: () => string;
    };
  }
}

export {};
