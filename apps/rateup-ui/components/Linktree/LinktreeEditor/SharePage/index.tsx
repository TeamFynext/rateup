import { useCallback } from "react";
import { useRouter } from "next/router";

import { Box, Image, Switch } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useTranslations } from "next-intl";

import { useUpdateLinktreeMutation } from "../../../../backend/linktree/linktree.query";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import { CopyLinkComponent } from "../../../Survey/ShareSurvey/ShareSurvey";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext";
import NoLinksFoundModal from "./NoLinksFoundModal";
import ShareLinktree from "./ShareLinktree";
import styles from "./ShareLinktree.module.css";
import SocialMediaLinks from "./SocialMediaLinks";

function SharePage() {
  const { isPublished, name, links } = useLinktreeObj();
  const {
    query: { shortUrlId },
  } = useRouter();
  const shareUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/lt/${shortUrlId}`;
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
  const translations = useTranslations();
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
