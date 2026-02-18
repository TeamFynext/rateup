"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DangerZoneProps {
  onReset: () => void;
  onDelete: () => void;
}

export function DangerZone({ onReset, onDelete }: DangerZoneProps) {
  const t = useTranslations();

  return (
    <Card className="border-2 border-red-200 shadow-sm bg-red-50/30">
      <CardHeader>
        <CardTitle className="text-base text-red-700">
          {t("Danger Zone")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between p-2.5 border-2 border-red-200 rounded-lg bg-white">
          <div>
            <p className="text-sm font-medium text-red-700">
              {t("Reset Points")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Set all to zero")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-red-300 text-red-600 hover:bg-red-50"
            onClick={onReset}
          >
            {t("Reset")}
          </Button>
        </div>

        <div className="flex items-center justify-between p-2.5 border-2 border-red-200 rounded-lg bg-white">
          <div>
            <p className="text-sm font-medium text-red-700">
              {t("Delete Program")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Remove all data")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-red-300 text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            {t("Delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
