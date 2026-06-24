import { Box, Button, ScrollArea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

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
    <Box className={styles["links-editor-root-div"]}>
      <Box className={styles["link-editor-contianer"]}>
        <Box className={styles["add-link-btn-container"]}>
          <Button
            className={styles["add-link-btn"]}
            fullWidth
            leftSection={<IconPlus />}
            onClick={openAddLinkModal}
          >
            Add Link
          </Button>
        </Box>

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
      </Box>
    </Box>
  );
}

export default LinksEditor;
