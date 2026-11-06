// Named re-exports, not `import("@sentry/tanstackstart-react")`: a dynamic import of the package
// keeps every export alive (replay, tracing, feedback) and the chunk triples.
export { captureException, init } from "@sentry/tanstackstart-react";
