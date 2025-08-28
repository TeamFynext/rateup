"use client";

import React from "react";

import { Grid, LoadingOverlay, Stack, Switch } from "@mantine/core";
import { useTranslations } from "next-intl";

import { useUpdateMenuMutation } from "../../../backend/menu/menu.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ShareQR from "../../Survey/ShareSurvey/ShareQR";
import { CopyLinkComponent } from "../../Survey/ShareSurvey/ShareSurvey";

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
  const translations = useTranslations();
  const shareLink = menu.shortUrlId
    ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/m/${shortUrlId}`
    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/m/${id}`;
  return (
    <Stack style={{ padding: "0.3125rem", paddingRight: "1rem" }}>
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
              label={
                isPublished
                  ? translations("Published")
                  : translations("Not Published")
              }
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
