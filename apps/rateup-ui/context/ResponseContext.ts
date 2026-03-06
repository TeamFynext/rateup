import { createContext } from "react";

import { UseListStateHandlers } from "@mantine/hooks";

interface CurrentResponsesContext {
  // TODO: add a dynamic type which changes based on the question type?
  response: any;
  updateResponse: any;
}

export const CurrentResponsesContext = createContext<CurrentResponsesContext>({
  response: undefined,
  updateResponse: undefined,
});
