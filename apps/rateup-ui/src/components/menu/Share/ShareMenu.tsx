import { useTranslation } from "react-i18next";

import { useUpdateMenuMutation } from "@/backend/menu/menu.query";

import ShareQR from "../../Survey/ShareSurvey/ShareQR/index.tsx";
import { CopyLinkComponent } from "../../Survey/ShareSurvey/ShareSurvey.tsx";
import { Card, CardContent } from "../../ui/card.tsx";
import { Switch } from "../../ui/switch.tsx";

type ShareMenuProps = {
  menu: {
    id: string;
    isPublished: boolean;
    surveyTeamMapId?: string;
    name: string;
    shortUrlId?: string;
  };
};

const ShareMenu = ({ menu }: ShareMenuProps) => {
  const { id, isPublished, name, shortUrlId } = menu;
  const { isPending, mutate } = useUpdateMenuMutation(
    id,
    () => {},
    () => {},
  );
  const { t: translations } = useTranslation();
  const shareLink = menu.shortUrlId
    ? `${import.meta.env.VITE_FRONTEND_URL}/m/${shortUrlId}`
    : `${import.meta.env.VITE_FRONTEND_URL}/m/${id}`;

  return (
    <div className="space-y-4 p-1 pr-4">
      <div className="relative grid grid-cols-1 gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
        <Card className="p-2">
          <CardContent className="flex gap-2">
            <Switch
              checked={!!isPublished}
              onCheckedChange={(checked) => {
                mutate({
                  menuId: id,
                  updatedData: { isPublished: checked },
                });
              }}
            />
            <p className="text-sm font-semibold">
              {isPublished ? translations("Published") : translations("Not Published")}
            </p>
          </CardContent>
        </Card>

        <CopyLinkComponent value={shareLink} disabled={!isPublished} />

        {isPending ? (
          <div className="absolute inset-0 z-10 rounded-md bg-background/70 backdrop-blur-[1px]" />
        ) : null}
      </div>

      <ShareQR
        id={id}
        url={shareLink}
        isPublished={isPublished}
        title={name}
        queryKey={"menuShareSettings"}
        resourceName={"menu"}
      />
    </div>
  );
};

export default ShareMenu;
