import { useMemo } from "react";

import { useLoyaltyGiveback } from "@/backend/loyalty/giveback.query";

import { calculateGiveback, type GivebackResult } from "./calculateGiveback";
import { useProgrammeGiveback, type ProgrammeGiveback } from "./useProgrammeGiveback";

/**
 * What the programme gives back, as the Overview and the Program page quote it.
 *
 * The server's figure is preferred — it is the one activation warned about, computed over
 * the rows as they stand — and the client copy of the same arithmetic fills in until it
 * arrives, or if the endpoint is unavailable. The wizard's live-as-you-type panels keep
 * using the client copy directly; there is no round trip fast enough for typing.
 */
export function useGivebackResult(enabled = true): {
  result: GivebackResult;
  source: "server" | "client";
  context: ProgrammeGiveback;
  isLoading: boolean;
} {
  const context = useProgrammeGiveback();
  const server = useLoyaltyGiveback(enabled);

  const result = useMemo(
    () => server.data?.result ?? calculateGiveback(context),
    [server.data?.result, context],
  );

  return {
    result,
    source: server.data?.result ? "server" : "client",
    context,
    isLoading: enabled && server.isPending,
  };
}
