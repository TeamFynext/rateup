import axios from "axios";

const WA_API_VERSION = "v18.0";

export const waAxios = axios.create({
    baseURL: `https://graph.facebook.com/${WA_API_VERSION}`,
    headers: {
        Authorization: "Bearer " + process.env.WA_ACCESS_TOKEN,
    }
})