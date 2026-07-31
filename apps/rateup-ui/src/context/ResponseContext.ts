import { createContext } from "react";

import type { StoredResponse } from "@/utils/response.ts";

interface CurrentResponsesContext {
  // TODO: add a dynamic type which changes based on the question type?
  /** The answer to the question being rendered, in whatever shape its type stores. */
  response: StoredResponse | null | undefined;
  updateResponse: (value: StoredResponse | null | undefined) => void;
}

export const CurrentResponsesContext = createContext<CurrentResponsesContext>({
  response: undefined,
  updateResponse: () => {},
});
