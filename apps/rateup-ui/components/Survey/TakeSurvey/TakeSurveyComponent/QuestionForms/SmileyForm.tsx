"use client";

import { useContext } from "react";

import { Group } from "@mantine/core";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import SmileyRating from "../SmileyRating";

export function SmileyForm({ features }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <SmileyRating
        updateResponse={updateResponse}
        response={response}
        features={features}
      />
    </Group>
  );
}
