import axios from "@/config/axios";
import { MembersResponse } from "@/context/type";

/** A team as `/team/user` returns it: the caller's own teams, with active member counts. */
export interface UserTeam {
  id: string;
  name: string;
  code: string;
  color?: string | null;
  _count?: { members: number };
}

export async function getTeamsByUser() {
  let teams = await axios.get("/api/team/user");
  return teams.data;
}

export async function getMembersByTeam() {
  let members = await axios.get("/api/org/members-with-teams");
  return members.data;
}

export async function getTeamsMembersOfOrg() {
  try {
    let members: MembersResponse = (await axios.get("/api/org/members-with-teams")).data;
    return members;
  } catch (e) {
    console.error(e);
    //return { error: "Error Occured!" };
  }
}
