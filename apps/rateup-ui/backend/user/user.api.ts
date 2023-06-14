import { axiosClient } from '../apiClient'

export const fetchUserInfo = () => axiosClient({
    url: `/user/info`,
    method: 'GET',
})