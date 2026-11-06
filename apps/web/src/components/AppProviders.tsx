import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SuperTokensWrapper } from "supertokens-auth-react";

// Static as well as awaited in `loadAppRuntime`: on a hard load the tree can hydrate before the
// layout's `beforeLoad` settles, and `SessionAuth` below must never meet an uninitialised SDK.
import "@/i18n";
import "@/lib/auth/supertokens";

/** Wraps each app layout's outlet. Marketing pages render without it. */
export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const { i18n } = useTranslation();

  // The shell renders `lang="en"`; only the app is translated, so it moves `lang` itself.
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
}
