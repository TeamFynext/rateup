import axios from "../config/axios"

export const addToken = async(token:string) => {
    const res = await axios.post("/api/mobilenotification",{expoToken:token})
    return res.data
}