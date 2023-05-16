import { axiosClient } from './apiClient'

export interface ICreateTeam {
    name: string; 
    orgId: string; 
    userId: string;
}

export const postTeam = (data: ICreateTeam) => axiosClient({
    url: `/team`,
    method: 'POST',
    data: data
})