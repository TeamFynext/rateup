/**
 * Query keys for the ticket boards.
 *
 * Byte-identical to the inline keys they replaced. `["board", boardId]` sits under the
 * `["board"]` root, so invalidating the bare root sweeps every board — several mutations
 * rely on that.
 */
export const ticketKeys = {
  /** Root prefix — invalidating this sweeps every single-board query. */
  board: () => ["board"] as const,
  boardDetail: (boardId: unknown) => ["board", boardId] as const,
  boards: () => ["boards"] as const,
} as const;
