import { axiosClient } from '../apiClient'

export interface ICreateTeam {
    name: string; 
    orgId: string; 
    userId: string;
}

export const createTeam = (data: ICreateTeam) => axiosClient({
    url: `/team`,
    method: 'POST',
    data: data
})

export const getTeamsByOrg = (orgId: String) => axiosClient({
    url: `/team/${orgId}`,
    method: 'GET',
})

export const deleteTeamById = (id: String) => axiosClient({
    url: `/team/${id}`,
    method: 'DELETE',
})