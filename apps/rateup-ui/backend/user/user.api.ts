import { axiosClient } from '../apiClient'

export interface ICreateGoogleUser {
    name: string; 
    orgName: string;
    inviteCode: string;
}

export const fetchUserInfo = () => axiosClient({
    url: `/user/info`,
    method: 'GET',
})

export const createGoogleUser = (data: ICreateGoogleUser) => axiosClient({
    url: `/user/complete-google-signup`,
    method: 'POST',
    data: data
})