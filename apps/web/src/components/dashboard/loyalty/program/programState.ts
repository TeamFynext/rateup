import type { LoyaltyProgram } from "@/backend/loyalty/program.api";

/** The three states every loyalty screen switches on. */
export type ProgramState = "draft" | "live" | "paused";

export function programStateOf(program: LoyaltyProgram | null | undefined): ProgramState {
  if (program?.status === "active") return "live";
  if (program?.status === "paused") return "paused";
  return "draft";
}
