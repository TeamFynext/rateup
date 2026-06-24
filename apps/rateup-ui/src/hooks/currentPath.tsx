import { useRouterState } from "@tanstack/react-router";

export function useCurrentPath() {
  const location = useRouterState({
    select: (s) => {
      return s.location.href;
    },
  });

  return location;
}
