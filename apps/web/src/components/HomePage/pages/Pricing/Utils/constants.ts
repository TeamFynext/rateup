export const CardWidth = "clamp(260px, 202.864px + 9.524vw, 340px)";
export const PlanCardWidth = "clamp(220px, 202.864px + 9.524vw, 300px)";
export const Title1 = "clamp(34px, 22.576px + 1.905vw, 50px)";
export const Title2 = "clamp(30px, 19.28px + 1.786vw, 45.008px)";
export const Title3 = "clamp(20px, 12.864px + 1.19vw, 30px)";
export const Title4 = "clamp(16px, 10.288px + 0.952vw, 24px)";

/**
 * The pricing page's light panel: the surface token rather than a literal white, with a
 * hairline ring that flips with the theme.
 *
 * These panels were `bg-white` with a fixed dark ring while their text used the semantic
 * tokens (`text-foreground`, `text-muted-foreground`, …). In dark mode the text inverted
 * and the panel did not, so every card rendered near-white text on white. `--card` is
 * `#ffffff` in the light scope, so this is the same pixel in light and only changes dark.
 */
export const PricingSurface =
  "bg-card shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1),0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]";
