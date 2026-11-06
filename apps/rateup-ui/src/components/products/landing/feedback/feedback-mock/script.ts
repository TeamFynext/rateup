import type { Script, ScriptStep } from "../../shared/useScript";

/** One counter is the whole story: each beat of the conversation is a phase. */
export interface FeedbackState {
  step: number;
  phase: number;
}

export const PHASE = {
  asked: 0,
  form: 1,
  overall: 2,
  food: 3,
  service: 4,
  comment: 5,
  submitted: 6,
  typing: 7,
  thanked: 8,
  alert: 9,
} as const;

const next = (s: FeedbackState): FeedbackState => ({ ...s, phase: s.phase + 1 });

const DELAYS = [1400, 1000, 700, 700, 1100, 1300, 900, 1200, 2200];

const INITIAL: FeedbackState = { step: 0, phase: PHASE.asked };

const STEPS: readonly ScriptStep<FeedbackState>[] = [
  ...DELAYS.map((delay) => ({ delay, apply: next })),
  { delay: 4400, apply: () => INITIAL },
];

export const FEEDBACK_SCRIPT: Script<FeedbackState> = {
  initial: INITIAL,
  final: { step: 0, phase: PHASE.alert },
  steps: STEPS,
};
