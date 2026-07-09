import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";

import NothingFound from "../../../NothingFound/NothingFound.tsx";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext.tsx";
import AddLinkModal from "./components/AddLinkOverlay/AddLinkModal.tsx";
import LinksList from "./components/LinksList.tsx";

import styles from "./LinksEditor.module.css";

function LinksEditor() {
  const linktreeObj = useLinktreeObj();
  const { links } = linktreeObj;
  const [isAddLinkModalOpen, { open: openAddLinkModal, close: closeAddLinkModal }] =
    useDisclosure();

  return (
    <div className={styles["links-editor-root-div"]}>
      <div className={styles["link-editor-contianer"]}>
        <div className={styles["add-link-btn-container"]}>
          <Button className={`${styles["add-link-btn"]} w-full`} onClick={openAddLinkModal}>
            <IconPlus data-icon="inline-start" />
            Add Link
          </Button>
        </div>

        <ScrollArea className={styles["links-list-container"]}>
          {!links || !links.length ? (
            <NothingFound text="No Links Found" />
          ) : (
            <LinksList links={links} />
          )}
        </ScrollArea>

        {isAddLinkModalOpen && (
          <AddLinkModal
            title={"Add Link"}
            opened={isAddLinkModalOpen}
            onClose={closeAddLinkModal}
            links={links ? links : []}
          />
        )}
      </div>
    </div>
  );
}

export default LinksEditor;
