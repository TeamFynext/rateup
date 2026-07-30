import { useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { Field, FieldTitle } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useDisclosure } from "@/hooks/useDisclosure";

import { CopyLinkComponent } from "../../../Survey/ShareSurvey/ShareSurvey.tsx";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext.tsx";
import NoLinksFoundModal from "./NoLinksFoundModal.tsx";
import ShareLinktree from "./ShareLinktree.tsx";
import SocialMediaLinks from "./SocialMediaLinks.tsx";

import styles from "./ShareLinktree.module.css";

function SharePage() {
  const { isPublished, name, links } = useLinktreeObj();
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const shareUrl = `${import.meta.env.VITE_FRONTEND_URL}/lt/${shortUrlId}`;
  const { mutateAsync: linktreeUpdateMutateAsync } = useUpdateLinktreeMutation(shortUrlId);

  const [isNoLinksFoundModalOpen, { open: openNoLinksFoundModal, close: closeNoLinksFoundModal }] =
    useDisclosure(false);
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
    <div className={styles["share-linktree-root-div"]}>
      <Field className="w-full overflow-auto rounded-lg bg-card p-4 shadow-md">
        <FieldTitle className="flex items-center gap-2">
          <Switch onClick={handlePublishSwitchClick} checked={isPublished} />
          {translations("Published")}
        </FieldTitle>
      </Field>
      <div
        className={`w-full overflow-auto rounded-lg bg-card p-4 shadow-md ${styles["share-options-container"]}`}
      >
        <div className={styles["linktree-link-container"]}>
          <h2>{translations("Share Linktree")}</h2>
          <CopyLinkComponent value={shareUrl} disabled={!isPublished} />
        </div>

        <div className={styles["social-media-share-container"]}>
          <h2>{translations("How Would you like to survey people?")}</h2>
          <SocialMediaLinks
            linktreeName={name}
            linktreeShareUrl={shareUrl}
            isPublished={!!isPublished}
          />
        </div>
      </div>
      <div
        className={`w-full overflow-auto rounded-lg bg-card p-4 shadow-md ${styles["share-qr-card"]}`}
      >
        <h2>{translations("Share QR Code")}</h2>
        <ShareLinktree url={shareUrl} isPublished={!!isPublished} title={name} />
      </div>
      <NoLinksFoundModal opened={isNoLinksFoundModalOpen} onClose={closeNoLinksFoundModal} />
    </div>
  );
}

export default SharePage;
