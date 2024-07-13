import { Box, Stack } from "@mantine/core";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useUpdateLandingPageMutation } from "../../../../../backend/landingPage/landingPage.query";
import Reorder from "./Reorder";
import ReorderItem from "./Reorder/ReorderItem";
import LinkCard from "./LinkCard";
import styles from "../LinksEditor.module.css";

function LinksList({ links }) {
  const {
    query: { shortUrlId },
  } = useRouter();
  const updateLandingPageMutation = useUpdateLandingPageMutation(shortUrlId);
  const { mutateAsync: landingPageUpdateMutateAsync } =
    useUpdateLandingPageMutation(shortUrlId);

  const handleDragEnd = useCallback(
    async (reorderedLinks) => {
      await updateLandingPageMutation.mutateAsync({
        shortUrlId,
        links: reorderedLinks,
      });
    },
    [shortUrlId, links],
  );

  const handleDelete = useCallback(
    async (linkId) => {
      const filteredLinks = links.filter(({ id }) => id !== linkId);
      await updateLandingPageMutation.mutateAsync({
        shortUrlId,
        links: filteredLinks,
      });
      if (!filteredLinks.length) {
        landingPageUpdateMutateAsync({
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
