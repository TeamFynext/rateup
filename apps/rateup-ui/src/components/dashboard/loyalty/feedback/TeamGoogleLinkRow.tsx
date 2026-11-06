import { IconAlertTriangle, IconBrandGoogle, IconEdit } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsByUser } from "@/backend/team/team.query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ReviewPagePlatform } from "@/types/enums.ts";

import { GoogleLinkDialog } from "./GoogleLinkDialog.tsx";

/**
 * The chosen team's Google review link, or a warning that it has none. The feature still
 * collects feedback without one — happy customers just get no review CTA — so the row
 * warns and offers the fix instead of blocking.
 */
export function TeamGoogleLinkRow({ teamId }: Readonly<{ teamId: string | undefined }>) {
  const { t } = useTranslation();
  const { data: teams } = useTeamsByUser();
  const [editing, setEditing] = useState(false);

  const team = teams?.data?.find((row) => row.id === teamId);
  if (!team) return null;

  const link = team.googleLink || team.reviewPageLinks?.[ReviewPagePlatform.Google] || "";

  return (
    <>
      {link ? (
        <div className="flex items-center gap-2 text-sm">
          <IconBrandGoogle size={16} className="shrink-0 text-muted-foreground" />
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline"
          >
            {link}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Edit Google review link")}
            onClick={() => setEditing(true)}
          >
            <IconEdit size={16} />
          </Button>
        </div>
      ) : (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>{t("{team} has no Google review link yet", { team: team.name })}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t("Feedback is still collected, but happy customers would have nowhere to go.")}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              {t("Add link")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <GoogleLinkDialog team={team} open={editing} onOpenChange={setEditing} />
    </>
  );
}
