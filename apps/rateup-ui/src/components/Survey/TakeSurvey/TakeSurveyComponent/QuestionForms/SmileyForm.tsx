import { Group } from "@mantine/core";
import { useContext } from "react";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";

import SmileyRating from "../SmileyRating/index.tsx";

export function SmileyForm({ features }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <SmileyRating updateResponse={updateResponse} response={response} features={features} />
    </Group>
  );
}
