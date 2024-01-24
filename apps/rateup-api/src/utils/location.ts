import axios from "axios";
import { log } from "./logger";
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

export async function fetchLocationFromIp(ip: string) {
  if (!ip) return undefined;
  try {
    const url = `https://api.geoapify.com/v1/ipinfo?ip=${ip}&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await axios.get(url);
    if (res.status !== 200) return null;
    log.trace("got location from ip %s => %o", ip, res.data);
    if (res.data.isPrivate) return null;

    const {
      city: { name: city },
      state: { name: state },
      country: { name: country },
      location: coordinates,
    } = res.data;

    return { coordinates, city, state, country };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function fetchLocationFromCoordinates(
  latitude: number,
  longitude: number,
) {
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await axios.get(url);
    if (res.status !== 200) return null;
    log.trace(
      "got location from coordinates %s,%s => %o",
      latitude,
      longitude,
      res.data,
    );

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
export async function fetchLocation(
  ip: string,
  coords: { latitude: number; longitude: number },
) {
  let location = null;
  if (!coords || !coords.latitude) {
    location = await fetchLocationFromIp(ip);
  } else {
    location = await fetchLocationFromCoordinates(
      coords.latitude,
      coords.longitude,
    );
  }

  log.trace("parsed location => %o", location);
  return location;
}
