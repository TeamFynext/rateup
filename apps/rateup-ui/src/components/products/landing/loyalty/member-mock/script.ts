import type { Script, ScriptStep } from "../../shared/useScript";

export interface MemberState {
  step: number;
  phase: number;
}

/** Each beat of the member's story, in order; the phone and the counter both read it. */
export const PHASE = {
  joined: 0,
  welcomed: 1,
  card: 2,
  scanned: 3,
  billed: 4,
  earned: 5,
  gold: 6,
  asked: 7,
  balance: 8,
} as const;

const DELAYS = [1300, 1600, 1900, 1300, 1200, 1900, 1400, 1800];

const INITIAL: MemberState = { step: 0, phase: PHASE.joined };

const STEPS: readonly ScriptStep<MemberState>[] = [
  ...DELAYS.map((delay) => ({ delay, apply: (s: MemberState) => ({ ...s, phase: s.phase + 1 }) })),
  { delay: 4400, apply: () => INITIAL },
];

export const MEMBER_SCRIPT: Script<MemberState> = {
  initial: INITIAL,
  final: { step: 0, phase: PHASE.balance },
  steps: STEPS,
};
