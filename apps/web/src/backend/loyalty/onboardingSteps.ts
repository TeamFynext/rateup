// Apart from `onboarding.api.ts` so route search validators can read it without pulling
// the API client into the client entry.
export const ONBOARDING_STEPS = ["profile", "earning", "tiers", "rewards", "messages"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
