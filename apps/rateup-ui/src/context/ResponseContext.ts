import { createContext } from "react";

interface CurrentResponsesContext {
  // TODO: add a dynamic type which changes based on the question type?
  response;
  updateResponse;
}

export const CurrentResponsesContext = createContext<CurrentResponsesContext>({
  response: undefined,
  updateResponse: undefined,
});
