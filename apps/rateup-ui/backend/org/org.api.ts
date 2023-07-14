import { axiosClient } from '../apiClient'

export const getTeamsMembersOfOrg = () => axiosClient({
  url: `/org/members`,
  method: 'GET',
})

export interface IUpdateRole {
  role: string; 
}

export const updateRole = (memberId: string , data: IUpdateRole) => axiosClient({
  url: `/org/members/change-role/${memberId}`,
  method: 'PUT',
  data: data
})