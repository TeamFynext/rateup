import { IconGripVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useConfirm } from "@/context/confirm-provider";

import { useLinktreeObj } from "../../LinktreeContext/LinktreeContext.tsx";

import styles from "../LinksEditor.module.css";

function LinkCard({ linkObj, onDelete }) {
  const { id, linkDisplayName, linkUrl } = linkObj;
  const [linkDisplayNameInputState, setLinkDisplayNameInputState] = useState(linkDisplayName);

  const [isLinkDisplayNameBeingEdited, setIsLinkDisplayNameBeingEdited] = useState(false);
  const [isLinkDisplayNameBeingUpdated, setIsLinkDisplayNameBeingUpdated] = useState(false);

  const [isLinkUrlBeingEdited, setIsLinkUrlBeingEdited] = useState(false);
  const [isLinkUrlBeingUpdated, setIsLinkUrlBeingUpdated] = useState(false);

  const [linkUrlInputState, setLinkUrlInputState] = useState(linkUrl);
  const linkDisplayNameInputRef = useRef<HTMLInputElement>(null);
  const linkUrlInputRef = useRef<HTMLInputElement>(null);

  const confirm = useConfirm();
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
    const ok = await confirm({
      title: "Delete Link?",
      description: "Are you sure to delete this Link?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;
    onDelete(linkObj.id);
  }, [onDelete, linkObj, confirm]);

  return (
    <div className={styles["link-card"]}>
      <div className={styles["drag-handle-icon-and-link-info-container"]}>
        <div className={styles["drag-handle-div"]}>
          <IconGripVertical size={"1.25rem"} />
        </div>
        <div className={styles["title-and-url-container"]}>
          {!isLinkDisplayNameBeingEdited ? (
            <Button
              className={styles["display-name-edit-btn"]}
              onClick={() => setIsLinkDisplayNameBeingEdited(true)}
            >
              {linkDisplayNameInputState}
              {isLinkDisplayNameBeingUpdated ? (
                <Spinner data-icon="inline-end" />
              ) : (
                <IconPencil data-icon="inline-end" />
              )}
            </Button>
          ) : (
            <Input
              aria-label="Link display name"
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
              onClick={() => setIsLinkUrlBeingEdited(true)}
            >
              {linkUrlInputState}
              {isLinkUrlBeingUpdated ? (
                <Spinner data-icon="inline-end" />
              ) : (
                <IconPencil data-icon="inline-end" />
              )}
            </Button>
          ) : (
            <Input
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
        </div>
      </div>

      <div className={styles["delete-btn-container"]}>
        <Button className={styles["delete-btn"]} onClick={handleDeleteClick}>
          <IconTrash data-icon="inline-start" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export default LinkCard;
