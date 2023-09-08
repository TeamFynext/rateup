import axios from "axios";

export async function fetchLocationCoordinatesFromIp(ip: string) {
    const { data } = await axios.get(`https://ipapi.co/${ip}/latlong/`);
    const [lat, long] = data.split(",");
    const [parsedLat, parsedLong] = [parseFloat(lat), parseFloat(long)]
    if (!parsedLat || !parsedLong) {
        return null;
    } else {
        return { latitude: parsedLat, longitude: parsedLong };
    }
}