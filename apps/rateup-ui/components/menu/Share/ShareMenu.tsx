import { Stack, Paper, Switch, Grid, LoadingOverlay } from "@mantine/core";
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
  };
};

const ShareMenu = ({ menu: { id, isPublished, surveyTeamMapId } }: ShareMenuProps) => {
  const { isPending, error, mutate } = useUpdateMenuMutation(
    id,
    () => {},
    () => {},
  );

  const shareLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/menu/${id}/feedback/${surveyTeamMapId}`;
  return (
    <Stack>
      <Paper px="md" py="lg" radius="md" shadow="lg">
        <Stack>
          <Grid p={"xs"} pos={"relative"}>
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
          <ShareQR url={shareLink} />
        </Stack>
      </Paper>
    </Stack>
  );
};

export default ShareMenu;
function showErrorToast(message: any) {
  throw new Error("Function not implemented.");
}
