import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

interface DangerZoneProps {
  onReset: () => void;
  onDelete: () => void;
  disabled?: boolean;
  showDelete?: boolean;
}

export function DangerZone({
  onReset,
  onDelete,
  disabled = false,
  showDelete = true,
}: Readonly<DangerZoneProps>) {
  const { t } = useTranslation();

  return (
    <Card className="border-2 border-destructive/30 shadow-sm bg-destructive/10">
      <CardHeader>
        <CardTitle className="text-base text-destructive ">{t("Danger Zone")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between p-2.5 border-2 border-destructive/30 rounded-lg bg-card">
          <div>
            <p className="text-sm font-medium text-destructive ">{t("Reset Points")}</p>
            <p className="text-xs text-muted-foreground">{t("Set all to zero")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 "
            onClick={onReset}
            disabled={disabled}
          >
            {t("Reset")}
          </Button>
        </div>

        {showDelete && (
          <div className="flex items-center justify-between p-2.5 border-2 border-destructive/30 rounded-lg bg-card">
            <div>
              <p className="text-sm font-medium text-destructive ">{t("Delete Program")}</p>
              <p className="text-xs text-muted-foreground">{t("Remove all data")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 "
              onClick={onDelete}
              disabled={disabled}
            >
              {t("Delete")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
