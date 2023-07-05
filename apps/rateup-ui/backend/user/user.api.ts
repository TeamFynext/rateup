import { axiosClient } from '../apiClient'

export interface ICreateGoogleUser {
    name: string; 
    orgName: string;
    inviteCode: string;
}

export interface IChangePassword {
    existingPassword: string; 
    newPassword: string;
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

export const changeUserPassword = (data: IChangePassword) => axiosClient({
    url: `/user/change-password`,
    method: 'POST',
    data: data
})