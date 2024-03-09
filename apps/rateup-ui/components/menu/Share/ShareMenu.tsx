import { Stack, Switch, Grid, LoadingOverlay } from "@mantine/core";
import React from "react";
import ShareQR from "../../Survey/ShareSurvey/ShareQR";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { CopyLinkComponent } from "../../Survey/ShareSurvey/ShareSurvey";
import { useUpdateMenuMutation } from "../../../backend/menu/menu.query";

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
  const { isPending, error, mutate } = useUpdateMenuMutation(
    id,
    () => {},
    () => {},
  );

  const shareLink = menu.shortUrlId
    ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/m/${shortUrlId}`
    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/m/${id}`;
  return (
    <Stack mb={"md"}>
      <Grid pos={"relative"}>
        <Grid.Col span={"content"}>
          <PaperLayout>
            <Switch
              size="lg"
              checked={!!isPublished}
              onChange={(event) => {
                mutate({
                  menuId: id,
                  updatedData: { isPublished: event.currentTarget.checked },
                });
              }}
              label={isPublished ? "Published" : "Not Published"}
              fw={"600"}
            />
          </PaperLayout>
        </Grid.Col>
        <Grid.Col span={"auto"}>
          <Stack mt={"xs"}>
            <CopyLinkComponent value={shareLink} disabled={!isPublished} />
          </Stack>
        </Grid.Col>
        <LoadingOverlay
          visible={isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
      </Grid>
      <ShareQR
        id={id}
        url={shareLink}
        isPublished={isPublished}
        title={name}
        queryKey={"menuShareSettings"}
        resourceName={"menu"}
      />
    </Stack>
  );
};

export default ShareMenu;
