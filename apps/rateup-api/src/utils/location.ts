import axios from "axios";
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

export async function fetchLocationFromIp(ip: string) {
    try {
        const url = `https://api.geoapify.com/v1/ipinfo?ip=${ip}&apiKey=${GEOAPIFY_API_KEY}`
        const res = await axios.get(url);
        if (res.status !== 200) return null;
        if (res.data.isPrivate) return null;

        const {
            city: { name: city },
            state: { name: state },
            country: { name: country },
            location: coordinates
        } = res.data;

        return { coordinates, city, state, country };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function fetchLocationFromCoordinates(latitude: number, longitude: number) {

    try {

        const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;
        const res = await axios.get(url);
        if (res.status !== 200) return null;

        const { city, state, country } = res.data.features[0].properties;

        return { coordinates: { latitude, longitude }, city, state, country };
    } catch (e) {
        console.error(e);
        return null;
    }
}