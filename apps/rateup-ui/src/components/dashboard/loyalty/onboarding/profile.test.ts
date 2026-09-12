import { describe, expect, test } from "vitest";

import { toProfilePayload } from "./profile.ts";
import { profileFormSchema } from "./schemas.ts";

const stored = {
  businessName: "Kettle & Co",
  name: "Kettle Rewards",
  currencyCode: "INR",
  currencySymbol: "₹",
  timezone: "Europe/Berlin",
  contactName: "Ann",
  contactPhone: "+919837123123",
  contactEmail: "ann@example.com",
  logoUrl: "",
  brandColor: "#1c518e",
  heroImageUrl: "",
};

describe("the profile form's image fields", () => {
  // The API stores both as `z.url()` and the step is one payload, so a value that is not
  // a URL used to 400 the whole save — the business details with it — under a generic
  // "Could not save this step". It is refused here instead, on the tile that produced it.
  test("a half-finished upload is refused, not sent", () => {
    const parsed = profileFormSchema.safeParse({ ...stored, logoUrl: "uploads/logo.png" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toContain("logoUrl");
  });

  test("an uploaded URL passes", () => {
    const url = "https://cdn.example.net/uploads/logo.png";
    const parsed = profileFormSchema.safeParse({ ...stored, logoUrl: url, heroImageUrl: url });
    expect(parsed.success).toBe(true);
    expect(parsed.data && toProfilePayload(parsed.data).logoUrl).toBe(url);
  });

  test("no image at all passes, and clears the stored one", () => {
    const parsed = profileFormSchema.safeParse(stored);
    expect(parsed.success).toBe(true);
    // `""` from an empty tile is "cleared", which the API spells null.
    expect(parsed.data && toProfilePayload(parsed.data).logoUrl).toBeNull();
    expect(parsed.data && toProfilePayload(parsed.data).heroImageUrl).toBeNull();
  });

  test("a removed image — undefined, not empty — passes too", () => {
    const parsed = profileFormSchema.safeParse({
      ...stored,
      logoUrl: undefined,
      heroImageUrl: undefined,
    });
    expect(parsed.success).toBe(true);
  });
});
