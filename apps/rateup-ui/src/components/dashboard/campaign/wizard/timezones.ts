/**
 * Zones a campaign can be scheduled in.
 *
 * A curated list rather than the full IANA database (~600 entries), because the
 * control is a select someone scans, not a search box. The browser's own zone is
 * added at the top when it is not already here, so nobody is ever forced to pick
 * a zone they are not in.
 */
const BASE_ZONES = [
  "Etc/UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Manila",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "America/Mexico_City",
] as const;

/** "Asia/Kolkata (IST, +5:30)" — the offset is what people actually recognise. */
function describeZone(zone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    });
    const offset =
      formatter.formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value ?? "";
    const abbreviation =
      new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "short" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? "";
    // A zone with no abbreviation of its own reports the offset twice; say it once.
    const detail = abbreviation && abbreviation !== offset ? `${abbreviation}, ${offset}` : offset;
    return detail ? `${zone} (${detail})` : zone;
  } catch {
    // An unknown zone must not take the whole select down with it.
    return zone;
  }
}

const localZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
})();

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  ...(localZone && !BASE_ZONES.includes(localZone as (typeof BASE_ZONES)[number])
    ? [{ value: localZone, label: describeZone(localZone) }]
    : []),
  ...BASE_ZONES.map((zone) => ({ value: zone, label: describeZone(zone) })),
];
