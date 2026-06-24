import { useParams } from "@tanstack/react-router";
import { useCallback } from "react";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";

import LinkCard from "./LinkCard.tsx";
import Reorder from "./Reorder/index.tsx";
import ReorderItem from "./Reorder/ReorderItem.tsx";

import styles from "../LinksEditor.module.css";

function LinksList({ links }) {
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);
  const { mutateAsync: linktreeUpdateMutateAsync } = useUpdateLinktreeMutation(shortUrlId);

  const handleDragEnd = useCallback(
    async (reorderedLinks) => {
      await updateLinktreeMutation.mutateAsync({
        shortUrlId,
        links: reorderedLinks,
      });
    },
    [shortUrlId, links],
  );

  const handleDelete = useCallback(
    async (linkId) => {
      const filteredLinks = links.filter(({ id }) => id !== linkId);
      await updateLinktreeMutation.mutateAsync({
        shortUrlId,
        links: filteredLinks,
      });
      if (!filteredLinks.length) {
        linktreeUpdateMutateAsync({
          shortUrlId,
          isPublished: false,
        });
      }
    },
    [shortUrlId, links],
  );

  return (
    <Reorder
      onDragEnd={handleDragEnd}
      itemsArr={links}
      className={styles["link-cards-container-div"]}
    >
      {links.map((linkObj, index) => {
        return (
          <ReorderItem
            key={linkObj.id}
            id={linkObj.id}
            index={index}
            className={styles["draggable-div-linkcard-parent"]}
          >
            <LinkCard linkObj={linkObj} onDelete={handleDelete} />
          </ReorderItem>
        );
      })}
    </Reorder>
  );
}

export default LinksList;
