import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Group } from "@mantine/core";
import SmileyRating from "../SmileyRating";

export function SmileyForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group p={"xs"}>
      <SmileyRating updateResponse={updateResponse} response={response} />
    </Group>
  );
}
