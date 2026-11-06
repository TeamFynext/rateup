import RateupLoader from "./RateupLoader.tsx";

/**
 * Router-wide pending UI. Route content is unmounted while a loader runs, so the wrapper carries
 * its own min-height — otherwise the spinner collapses into a zero-height row.
 */
export default function RoutePending() {
  return <RateupLoader role="status" aria-label="Loading" className="min-h-[50vh] w-full" />;
}
