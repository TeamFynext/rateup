"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import { useUpdateLinktreeMutation } from "../../../../../backend/linktree/linktree.query";
import styles from "../LinksEditor.module.css";
import LinkCard from "./LinkCard";
import Reorder from "./Reorder";
import ReorderItem from "./Reorder/ReorderItem";

function LinksList({ links }) {
  const params = useParams();
  const shortUrlId = params?.shortUrlId as string;
  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);
  const { mutateAsync: linktreeUpdateMutateAsync } =
    useUpdateLinktreeMutation(shortUrlId);

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
