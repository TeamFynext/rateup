import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

interface BackLinkProps {
  /** Where back goes. A real destination, so the control is a link and opens in a new tab. */
  to: string;
  params?: Record<string, unknown>;
  search?: Record<string, unknown>;
  /** Names the destination, already translated:"Members", not"Back to Members". */
  label: string;
  /** Drops the text for dense headers. The destination still names the control for a reader. */
  iconOnly?: boolean;
  /** A side effect on leaving, such as invalidating a list this page edited. */
  onClick?: () => void;
  className?: string;
}

/**
 * The one back control.
 *
 * Before this existed the app had thirteen of them: three navigation mechanisms, two icons,
 * fifteen label patterns and six placement margins, including one that was a raw `<button>`
 * with a `←` glyph and one whose label sat outside the button, so the button had no
 * accessible name and the word was not clickable.
 *
 * It renders a `<Link>` rather than calling `history.back()`, because back-to-a-parent is a
 * destination, not a browser gesture: `history.back()` sends a visitor who deep-linked into
 * the page somewhere else entirely, and it cannot be opened in a new tab.
 */
export function BackLink({
  to,
  params,
  search,
  label,
  iconOnly,
  onClick,
  className,
}: Readonly<BackLinkProps>) {
  const { t } = useTranslation();
  const text = t("Back to {destination}", { destination: label });
  return (
    <Button
      variant="ghost"
      size={iconOnly ? "icon-sm" : "sm"}
      aria-label={iconOnly ? text : undefined}
      onClick={onClick}
      className={cn(
        "w-fit text-muted-foreground hover:text-foreground",
        !iconOnly && "-ml-2",
        className,
      )}
      // `Link`'s props are generic over the route tree; this component is not, so the
      // destination is checked by the caller's own route constant, not here.
      render={<Link to={to} params={params as never} search={search as never} />}
    >
      <IconArrowLeft data-icon="inline-start" aria-hidden="true" />
      {iconOnly ? null : text}
    </Button>
  );
}
