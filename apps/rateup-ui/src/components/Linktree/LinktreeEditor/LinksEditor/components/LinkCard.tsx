"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Box, Button, Loader, Text, TextInput } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconGripVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import modalStyles from "@/styles/commonCssModules/modal.module.css";

import restOfModalStyles from "../../../LinktreeCard/LinktreeCard.module.css";
import { useLinktreeObj } from "../../LinktreeContext/LinktreeContext.tsx";
import styles from "../LinksEditor.module.css";

function LinkCard({ linkObj, onDelete }) {
  const { id, linkDisplayName, linkUrl } = linkObj;
  const [linkDisplayNameInputState, setLinkDisplayNameInputState] =
    useState(linkDisplayName);

  const [isLinkDisplayNameBeingEdited, setIsLinkDisplayNameBeingEdited] =
    useState(false);
  const [isLinkDisplayNameBeingUpdated, setIsLinkDisplayNameBeingUpdated] =
    useState(false);

  const [isLinkUrlBeingEdited, setIsLinkUrlBeingEdited] = useState(false);
  const [isLinkUrlBeingUpdated, setIsLinkUrlBeingUpdated] = useState(false);

  const [linkUrlInputState, setLinkUrlInputState] = useState(linkUrl);
  const linkDisplayNameInputRef = useRef(null);
  const linkUrlInputRef = useRef(null);

  const { links } = useLinktreeObj();
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);

  useEffect(() => {
    if (linkDisplayNameInputRef.current) {
      linkDisplayNameInputRef.current.focus();
    }
  }, [isLinkDisplayNameBeingEdited]);

  useEffect(() => {
    if (linkUrlInputRef.current) {
      linkUrlInputRef.current.focus();
    }
  }, [isLinkUrlBeingEdited]);

  const getNewLinksArr = useCallback(
    (changedValueObj) => {
      const newLinksArr = links.map((linkObj) => {
        if (linkObj.id === id) {
          return {
            ...linkObj,
            ...changedValueObj,
          };
        } else {
          return linkObj;
        }
      });
      return newLinksArr;
    },
    [links],
  );

  const handleLinkDisplayNameInputBlur = useCallback(async () => {
    setIsLinkDisplayNameBeingEdited(false);
    const reqBody = {
      shortUrlId,
      links: getNewLinksArr({ linkDisplayName: linkDisplayNameInputState }),
    };
    if (linkDisplayName !== linkDisplayNameInputState) {
      setIsLinkDisplayNameBeingUpdated(true);
      await updateLinktreeMutation.mutateAsync(reqBody);
      setIsLinkDisplayNameBeingUpdated(false);
    }
  }, [linkDisplayName, linkDisplayNameInputState]);

  const handleLinkUrlInputBlur = useCallback(async () => {
    setIsLinkUrlBeingEdited(false);
    const reqBody = {
      shortUrlId,
      links: getNewLinksArr({ linkUrl: linkUrlInputState }),
    };
    if (linkUrl !== linkUrlInputState) {
      setIsLinkUrlBeingUpdated(true);
      await updateLinktreeMutation.mutateAsync(reqBody);
      setIsLinkUrlBeingUpdated(false);
    }
  }, [linkUrl, linkUrlInputState]);

  const handleDeleteClick = useCallback(async () => {
    modals.openConfirmModal({
      title: "Delete Link?",
      children: (
        <Text className={restOfModalStyles["are-you-sure-text"]}>
          Are you sure to delete this Link?
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      className: restOfModalStyles["delete-confirmation-modal"],
      centered: true,
      classNames: {
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
        content: modalStyles["modal-content"],
      },
      onConfirm: () => onDelete(linkObj.id),
    });
  }, [onDelete, linkObj]);

  return (
    <Box className={styles["link-card"]}>
      <Box className={styles["drag-handle-icon-and-link-info-container"]}>
        <Box className={styles["drag-handle-div"]}>
          <IconGripVertical size={"1.25rem"} />
        </Box>
        <Box className={styles["title-and-url-container"]}>
          {!isLinkDisplayNameBeingEdited ? (
            <Button
              className={styles["display-name-edit-btn"]}
              rightSection={
                isLinkDisplayNameBeingUpdated ? (
                  <Loader size={"1rem"} />
                ) : (
                  <IconPencil size={"1rem"} />
                )
              }
              onClick={() => setIsLinkDisplayNameBeingEdited(true)}
            >
              {linkDisplayNameInputState}
            </Button>
          ) : (
            <TextInput
              className={`${styles["link-card-input"]} ${styles["display-name-input"]}`}
              value={linkDisplayNameInputState}
              onChange={(e) => setLinkDisplayNameInputState(e.target.value)}
              onBlur={handleLinkDisplayNameInputBlur}
              ref={linkDisplayNameInputRef}
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  linkDisplayNameInputRef.current?.blur();
                }
              }}
            />
          )}

          {!isLinkUrlBeingEdited ? (
            <Button
              className={styles["link-url-edit-btn"]}
              rightSection={
                isLinkUrlBeingUpdated ? (
                  <Loader size={"1rem"} />
                ) : (
                  <IconPencil size={"1rem"} />
                )
              }
              onClick={() => setIsLinkUrlBeingEdited(true)}
            >
              {linkUrlInputState}
            </Button>
          ) : (
            <TextInput
              ref={linkUrlInputRef}
              className={`${styles["link-card-input"]} ${styles["linkurl-input"]}`}
              value={linkUrlInputState}
              onChange={(e) => setLinkUrlInputState(e.target.value)}
              onBlur={handleLinkUrlInputBlur}
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  linkUrlInputRef.current?.blur();
                }
              }}
            />
          )}
        </Box>
      </Box>

      <Box className={styles["delete-btn-container"]}>
        <Button
          className={styles["delete-btn"]}
          leftSection={<IconTrash size={"0.875rem"} />}
          // onClick={() => onDelete(linkObj.id)}
          onClick={handleDeleteClick}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
}

export default LinkCard;
