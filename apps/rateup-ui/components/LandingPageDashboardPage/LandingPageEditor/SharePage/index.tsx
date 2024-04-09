import { useCallback } from "react";
import { Box, Image, Switch } from "@mantine/core";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import { CopyLinkComponent } from "../../../Survey/ShareSurvey/ShareSurvey";
import { useRouter } from "next/router";
import { useLandingPageObj } from "../LandingPageContext/LandingPageContext";
import SocialMediaLinks from "./SocialMediaLinks";
import ShareLandingPage from "./ShareLandingPage";
import { useUpdateLandingPageMutation } from "../../../../backend/landingPage/landingPage.query";
import styles from "./ShareLandingPage.module.css";
import NoLinksFoundModal from "./NoLinksFoundModal";
import { useDisclosure } from "@mantine/hooks";

function SharePage() {
  const { isPublished, name, links } = useLandingPageObj();
  const {
    query: { shortUrlId },
  } = useRouter();
  const shareUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/lt/${shortUrlId}`;
  const { mutateAsync: landingPageUpdateMutateAsync } =
    useUpdateLandingPageMutation(shortUrlId);

  const [
    isNoLinksFoundModalOpen,
    { open: openNoLinksFoundModal, close: closeNoLinksFoundModal },
  ] = useDisclosure(false);
  const handlePublishSwitchClick = useCallback(() => {
    if (!links?.length && !isPublished) {
      openNoLinksFoundModal();
    } else {
      landingPageUpdateMutateAsync({
        shortUrlId,
        isPublished: !isPublished,
      });
    }
  }, [isPublished, links, shortUrlId, landingPageUpdateMutateAsync]);

  return (
    <Box className={styles["share-landingPage-root-div"]}>
      <PaperLayout>
        <Switch
          onClick={handlePublishSwitchClick}
          size="lg"
          label="Published"
          checked={isPublished}
        />
      </PaperLayout>

      <PaperLayout className={styles["share-options-container"]}>
        <Box className={styles["landingPage-link-container"]}>
          <h2>Share Landing Page</h2>
          <CopyLinkComponent value={shareUrl} disabled={!isPublished} />
        </Box>

        <Box className={styles["social-media-share-container"]}>
          <h2>How Would you like to survey people?</h2>
          <SocialMediaLinks
            landingPageName={name}
            landingPageShareUrl={shareUrl}
            isPublished={isPublished}
          />
        </Box>
      </PaperLayout>

      <PaperLayout className={styles["share-qr-card"]}>
        <h2>Share QR Code</h2>
        <ShareLandingPage
          url={shareUrl}
          isPublished={isPublished}
          title={name}
        />
      </PaperLayout>

      <NoLinksFoundModal
        opened={isNoLinksFoundModalOpen}
        onClose={closeNoLinksFoundModal}
      />
    </Box>
  );
}

export default SharePage;
