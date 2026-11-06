import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import axios from "axios";
import { fetchLocation, fetchLocationFromCoordinates } from "./location.js";

type Mock = ReturnType<typeof vi.fn>;

const axiosGet = (axios as unknown as { get: Mock }).get;

function geoapifyResponse(properties: Record<string, unknown>) {
  return { status: 200, data: { features: [{ properties }] } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  axiosGet.mockResolvedValue(
    geoapifyResponse({ city: "Berlin", state: "Berlin", country: "Germany" }),
  );
});

describe("fetchLocationFromCoordinates", () => {
  test("returns the place the coordinates resolve to, alongside the coordinates", async () => {
    const result = await fetchLocationFromCoordinates(52.52, 13.405);

    expect(result).toEqual({
      coordinates: { latitude: 52.52, longitude: 13.405 },
      city: "Berlin",
      state: "Berlin",
      country: "Germany",
    });
  });

  test("asks the geocoder for a reverse lookup on those coordinates", async () => {
    await fetchLocationFromCoordinates(52.52, 13.405);

    const url = axiosGet.mock.calls[0][0] as string;
    expect(url).toContain("geocode/reverse");
    expect(url).toContain("lat=52.52");
    expect(url).toContain("lon=13.405");
  });

  test("returns null when the geocoder answers with anything but 200", async () => {
    axiosGet.mockResolvedValue({ status: 429, data: {} });

    await expect(fetchLocationFromCoordinates(52.52, 13.405)).resolves.toBeNull();
  });

  test("returns null when the request fails outright", async () => {
    axiosGet.mockRejectedValue(new Error("network down"));

    await expect(fetchLocationFromCoordinates(52.52, 13.405)).resolves.toBeNull();
  });

  test("returns null when the geocoder recognises nothing at that point", async () => {
    axiosGet.mockResolvedValue({ status: 200, data: { features: [] } });

    await expect(fetchLocationFromCoordinates(0, 0)).resolves.toBeNull();
  });

  test("passes through the fields the geocoder left blank", async () => {
    axiosGet.mockResolvedValue(geoapifyResponse({ country: "Germany" }));

    const result = await fetchLocationFromCoordinates(52.52, 13.405);

    expect(result).toMatchObject({ city: undefined, state: undefined, country: "Germany" });
  });
});

describe("fetchLocation", () => {
  test("resolves the coordinates it is given", async () => {
    const result = await fetchLocation({ latitude: 52.52, longitude: 13.405 });

    expect(result).toMatchObject({ city: "Berlin" });
    expect(axiosGet).toHaveBeenCalled();
  });

  test.each([
    ["no coordinates at all", undefined],
    ["null coordinates", null],
    ["coordinates with no latitude", { longitude: 13.405 }],
  ])("returns null without calling the geocoder for %s", async (_name, coords) => {
    await expect(fetchLocation(coords as any)).resolves.toBeNull();
    expect(axiosGet).not.toHaveBeenCalled();
  });

  // Latitude 0 is the equator, a real place: absence is checked explicitly rather than
  // by falsiness, so it is looked up like any other coordinate.
  test("looks up a latitude of exactly zero", async () => {
    await fetchLocation({ latitude: 0, longitude: 13.405 });

    expect(axiosGet).toHaveBeenCalled();
  });

  test("looks up a longitude of exactly zero too", async () => {
    await fetchLocation({ latitude: 52.52, longitude: 0 });

    expect(axiosGet).toHaveBeenCalled();
  });
});
