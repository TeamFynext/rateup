import { IconBook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { docsPath } from "@/utils/constants.ts";

/**
 * Documentation shortcut in the icon rail. Like "What's new", it lives in the
 * rail rather than the nav panel so it stays reachable from every section and
 * at every width.
 */
export default function DocsButton() {
  const { t: translations } = useTranslation();
  const label = translations("Documentation");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="secondary"
            size="icon-sm"
            className="mx-auto h-8 w-8"
            aria-label={label}
            // Rendering as an anchor, so opt out of Base UI's native-<button> expectation.
            nativeButton={false}
            render={<a href={docsPath} target="_blank" rel="noreferrer" />}
          />
        }
      >
        <IconBook className="size-5" strokeWidth={1.8} />
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
