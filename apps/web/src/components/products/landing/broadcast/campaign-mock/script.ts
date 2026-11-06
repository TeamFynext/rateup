import type { Script, ScriptStep } from "../../shared/useScript";

export interface CampaignState {
  step: number;
  phase: number;
  counts: Readonly<Record<"Attempted" | "Delivered" | "Read" | "Replied", number>>;
}

export const PHASE = { sending: 0, delivered: 1, read: 2, replied: 3, retried: 4 } as const;

const COUNTS: readonly CampaignState["counts"][] = [
  { Attempted: 12400, Delivered: 7120, Read: 2310, Replied: 0 },
  { Attempted: 12400, Delivered: 11620, Read: 6480, Replied: 96 },
  { Attempted: 12400, Delivered: 11860, Read: 9410, Replied: 318 },
  { Attempted: 12400, Delivered: 11860, Read: 9720, Replied: 486 },
  { Attempted: 12400, Delivered: 12074, Read: 9905, Replied: 512 },
];

const at = (phase: number): CampaignState => ({ step: 0, phase, counts: COUNTS[phase] });

const INITIAL = at(PHASE.sending);

const STEPS: readonly ScriptStep<CampaignState>[] = [
  ...[1400, 1600, 1800, 2000].map((delay) => ({
    delay,
    apply: (s: CampaignState) => ({ ...at(s.phase + 1), step: s.step }),
  })),
  { delay: 4400, apply: () => INITIAL },
];

export const CAMPAIGN_SCRIPT: Script<CampaignState> = {
  initial: INITIAL,
  final: at(PHASE.retried),
  steps: STEPS,
};
