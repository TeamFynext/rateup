"use client";

import { useCallback } from "react";

import { Box, Switch } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";

import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";
import { CopyLinkComponent } from "../../../Survey/ShareSurvey/ShareSurvey.tsx";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext.tsx";
import NoLinksFoundModal from "./NoLinksFoundModal.tsx";
import styles from "./ShareLinktree.module.css";
import ShareLinktree from "./ShareLinktree.tsx";
import SocialMediaLinks from "./SocialMediaLinks.tsx";

function SharePage() {
  const { isPublished, name, links } = useLinktreeObj();
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const shareUrl = `${import.meta.env.VITE_FRONTEND_URL}/lt/${shortUrlId}`;
  const { mutateAsync: linktreeUpdateMutateAsync } =
    useUpdateLinktreeMutation(shortUrlId);

  const [
    isNoLinksFoundModalOpen,
    { open: openNoLinksFoundModal, close: closeNoLinksFoundModal },
  ] = useDisclosure(false);
  const handlePublishSwitchClick = useCallback(() => {
    if (!links?.length && !isPublished) {
      openNoLinksFoundModal();
    } else {
      linktreeUpdateMutateAsync({
        shortUrlId,
        isPublished: !isPublished,
      });
    }
  }, [isPublished, links, shortUrlId, linktreeUpdateMutateAsync]);
  const { t: translations } = useTranslation();
  return (
    <Box className={styles["share-linktree-root-div"]}>
      <PaperLayout>
        <Switch
          onClick={handlePublishSwitchClick}
          size="lg"
          label={translations("Published")}
          checked={isPublished}
        />
      </PaperLayout>
      <PaperLayout className={styles["share-options-container"]}>
        <Box className={styles["linktree-link-container"]}>
          <h2>{translations("Share Linktree")}</h2>
          <CopyLinkComponent value={shareUrl} disabled={!isPublished} />
        </Box>

        <Box className={styles["social-media-share-container"]}>
          <h2>{translations("How Would you like to survey people?")}</h2>
          <SocialMediaLinks
            linktreeName={name}
            linktreeShareUrl={shareUrl}
            isPublished={isPublished}
          />
        </Box>
      </PaperLayout>
      <PaperLayout className={styles["share-qr-card"]}>
        <h2>{translations("Share QR Code")}</h2>
        <ShareLinktree url={shareUrl} isPublished={isPublished} title={name} />
      </PaperLayout>
      <NoLinksFoundModal
        opened={isNoLinksFoundModalOpen}
        onClose={closeNoLinksFoundModal}
      />
    </Box>
  );
}

export default SharePage;
