import axios, { AxiosRequestConfig } from "axios";
import { log } from "../../utils/logger";

const WA_API_VERSION = "v18.0";

export async function callWhatsappApi(
    url: string,
    method: AxiosRequestConfig['method'],
    accessToken?: string,
    data?: AxiosRequestConfig['data'],
): Promise<any> {
    const config: AxiosRequestConfig = {
        url: `https://graph.facebook.com/${WA_API_VERSION}/${url}`,
        method,
        data,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    };
    log.trace("Calling WhatsApp API with config: %o", config)
    return await axios(config);
}