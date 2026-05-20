import { defineEventHandler, getRequestURL, redirect } from "h3";

import redirects from "../../redirects/index.ts";

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname;
  const redirectRule = redirects.find((rule) => rule.source === pathname);

  if (!redirectRule) {
    return;
  }

  let statusCode = 302;
  if ("statusCode" in redirectRule) {
    statusCode = redirectRule.statusCode;
  } else if (redirectRule.permanent) {
    statusCode = 301;
  }

  return redirect(redirectRule.destination, statusCode);
});
