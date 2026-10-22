import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Static as well as awaited in the layout's `beforeLoad`: on a hard load the tree can hydrate
// before that settles.
import "@/i18n";

/** The shop's lighter stand-in for `AppProviders`: translations, no SuperTokens. */
export function ShopProviders({ children }: Readonly<{ children: ReactNode }>) {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return children;
}
