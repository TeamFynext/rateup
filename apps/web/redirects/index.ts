import blogRedirects from "./redirects-blog.ts";
import pageRedirects from "./redirects-pages.ts";

export type RedirectRule = {
  to: string;
  statusCode?: 301 | 302;
};

// via `beforeLoad` using TanStack's type-safe `redirect()`.
export const REDIRECT_MAP: Record<string, RedirectRule> = {
  ...blogRedirects,
  ...pageRedirects,
};

export default REDIRECT_MAP;
