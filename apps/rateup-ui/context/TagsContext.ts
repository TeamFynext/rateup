"use client";

import { createContext, useContext } from "react";

export const TagsContext = createContext({
  tags: {
    contactTags: [],
    contactGroupTags: [],
    inboxLabels: [],
  },
});

export const useTagsContext = () => {
  return useContext(TagsContext);
};
