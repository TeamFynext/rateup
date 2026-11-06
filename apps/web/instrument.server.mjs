import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://45e833b32b687745181d312ce71aaa60@o4508794356432896.ingest.de.sentry.io/4511626235347024",

  // Errors only, no personal data: no client IP / user fields, no cookies (SuperTokens session),
  // no request/response bodies, and the OAuth/invite secrets that ride in query strings
  // (`/auth/fb?code=`, `/invite?token=`, Shopify `hmac`/`state`) are dropped from URLs.
  // Keep in sync with `src/lib/errorReporting.ts`.
  // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#dataCollection
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    httpHeaders: {
      request: {
        deny: ["authorization", "cookie", "x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
      },
      response: { deny: ["set-cookie"] },
    },
    urlQueryParams: { deny: ["code", "token", "state", "hmac", "access_token", "id_token"] },
  },
});
