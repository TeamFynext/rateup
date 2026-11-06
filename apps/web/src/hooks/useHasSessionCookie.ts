import { useEffect, useState } from "react";

/* The pair SuperTokens' own local check requires before it reports EXISTS
   (`getLocalSessionState` in supertokens-website). */
const SESSION_COOKIES = [/(?:^|;\s*)sFrontToken=/, /(?:^|;\s*)st-last-access-token-update=/];

/**
 * Whether this browser holds a session, read from the cookies the SDK writes, so marketing pages
 * can choose "Dashboard" over "Login" without downloading SuperTokens. Read in an effect, so the
 * server HTML stays the same for every visitor.
 */
export function useHasSessionCookie() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    setHasSession(SESSION_COOKIES.every((cookie) => cookie.test(document.cookie)));
  }, []);

  return hasSession;
}
