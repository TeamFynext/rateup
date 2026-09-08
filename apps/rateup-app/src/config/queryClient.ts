import { QueryClient } from "@tanstack/react-query";

/**
 * The app's single QueryClient.
 *
 * Lives here rather than in `app/_layout.tsx` so that non-React modules can
 * reach it without importing the root layout, which would pull the whole
 * screen graph in and create an import cycle. `clearLocalUserData` needs it to
 * drop cached responses on sign-out.
 */
export const queryClient = new QueryClient();
