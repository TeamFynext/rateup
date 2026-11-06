import axios from "axios";
import { log } from "./logger.js";
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

export async function fetchLocationFromCoordinates(latitude: number, longitude: number) {
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await axios.get(url);
    if (res.status !== 200) return null;
    log.trace("got location from coordinates %s,%s => %o", latitude, longitude, res.data);

    const { city, state, country } = res.data.features[0].properties;

    return { coordinates: { latitude, longitude }, city, state, country };
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * If coordinates are provided, uses them to fetch location information.
 * Otherwise, ip address is used.
 * @param ip
 * @param coords
 * @returns
 */
// Callers pass the stored `SurveyResponse.location.coordinates`, which is optional.
export async function fetchLocation(coords?: { latitude: number; longitude: number }) {
  let location = null;
  // Checked for absence, not falsiness: latitude 0 is the equator, a real place, and
  // `!coords.latitude` silently dropped it.
  if (!coords || coords.latitude === null || coords.latitude === undefined) {
    return null;
  } else {
    location = await fetchLocationFromCoordinates(coords.latitude, coords.longitude);
  }

  log.trace("parsed location => %o", location);
  return location;
}
