import { Box, Switch } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateLandingPageMutation } from "@/backend/landingPage/landingPage.query";

import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";
import { CopyLinkComponent } from "../../../Survey/ShareSurvey/ShareSurvey.tsx";
import {
  useLandingPageObj,
  useTiptapEditorInstance,
} from "../LandingPageContext/LandingPageContext.tsx";
import NoContentFoundModal from "./NoContentFoundModal.tsx";
import ShareLandingPage from "./ShareLandingPage.tsx";
import SocialMediaLinks from "./SocialMediaLinks.tsx";

import styles from "./ShareLandingPage.module.css";

function SharePage() {
  const { isPublished, name, tiptapEditorContent } = useLandingPageObj();
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const shareUrl = `${import.meta.env.VITE_FRONTEND_URL}/lp/${shortUrlId}`;
  const { mutateAsync: landingPageUpdateMutateAsync } = useUpdateLandingPageMutation(shortUrlId);

  const editorInstance = useTiptapEditorInstance();
  const { t: translations } = useTranslation();
  const [
    isNoContentFoundModalOpen,
    { open: openNoContentFoundModal, close: closeNoContentFoundModal },
  ] = useDisclosure(false);
  const handlePublishSwitchClick = useCallback(() => {
    if (!editorInstance?.isEmpty || isPublished) {
      landingPageUpdateMutateAsync({
        shortUrlId,
        isPublished: !isPublished,
      });
    } else {
      openNoContentFoundModal();
    }
  }, [isPublished, tiptapEditorContent, shortUrlId, landingPageUpdateMutateAsync]);

  return (
    <Box className={styles["share-landingPage-root-div"]}>
      <PaperLayout>
        <Switch
          onClick={handlePublishSwitchClick}
          size="lg"
          label={translations("Published")}
          checked={isPublished}
        />
      </PaperLayout>
      <PaperLayout className={styles["share-options-container"]}>
        <Box className={styles["landingPage-link-container"]}>
          <h2>{translations("Share Landing Page")}</h2>
          <CopyLinkComponent value={shareUrl} disabled={!isPublished} />
        </Box>

        <Box className={styles["social-media-share-container"]}>
          <h2>{translations("How Would you like to survey people?")}</h2>
          <SocialMediaLinks
            landingPageName={name}
            landingPageShareUrl={shareUrl}
            isPublished={isPublished}
          />
        </Box>
      </PaperLayout>
      <PaperLayout className={styles["share-qr-card"]}>
        <h2>{translations("Share QR Code")}</h2>
        <ShareLandingPage url={shareUrl} isPublished={isPublished} title={name} />
      </PaperLayout>
      <NoContentFoundModal opened={isNoContentFoundModalOpen} onClose={closeNoContentFoundModal} />
    </Box>
  );
}

export default SharePage;
