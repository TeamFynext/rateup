import { useMutation } from "@tanstack/react-query";

import { bookDemo } from "./bookdemo.api";

export function useBookDemoMutation() {
  return useMutation({
    mutationFn: bookDemo,
  });
}
