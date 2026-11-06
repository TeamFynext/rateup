// Utility function from old flow-v2 for compatibility
// Used by WaResponses, FlowPreviewComponents, and tickets

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/[#_*~>]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/!\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`{1,3}.*?`{1,3}/g, "");
}
