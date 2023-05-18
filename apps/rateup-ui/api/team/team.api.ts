import { axiosClient } from '../apiClient'

export interface ICreateTeam {
    name: string; 
    orgId: string; 
    userId: string;
}


export interface IInviteMember {
    name: string; 
    orgId: string; 
    invitedBy: string;
    teamId: string;
    email: string;

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
<<<<<<< HEAD

export const inviteTeamMember = (data: IInviteMember) => axiosClient({
    url: `/team/invite`,
    method: 'POST',
    data: data
})

export const getTeamMembers= (teamId: String) => axiosClient({
    url: `/team/members/${teamId}`,
    method: 'GET',
})
=======
>>>>>>> 2ddb7e9 (display teams)
