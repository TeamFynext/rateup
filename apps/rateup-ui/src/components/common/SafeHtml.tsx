import { useMemo, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";

import { htmlToPlainText } from "@/utils/htmlSafety.ts";
import { sanitizeRichText } from "@/utils/sanitizeHtml.ts";

const subscribe = () => () => {};

/** false on the server and while hydrating, true afterwards (and on client-side navigations). */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

interface SafeHtmlProps {
  /** Untrusted rich text (org-authored titles etc.). */
  html: string | null | undefined;
  as?: "div" | "span";
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders org-authored rich text through `sanitizeRichText`. DOMPurify only runs in the
 * browser, so the server and the hydration pass render the plain text; the sanitised HTML is
 * swapped in right after, which keeps SSR and the first client render identical.
 */
export function SafeHtml({ html, as: Tag = "div", className, style }: Readonly<SafeHtmlProps>) {
  const hydrated = useIsHydrated();
  const markup = useMemo(() => (hydrated ? sanitizeRichText(html) : null), [hydrated, html]);

  if (markup === null) {
    return (
      <Tag className={className} style={style}>
        {htmlToPlainText(html)}
      </Tag>
    );
  }
  return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: markup }} />;
}
