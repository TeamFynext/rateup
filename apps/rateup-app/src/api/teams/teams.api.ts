import axios from "@/src/config/axios";

export async function getTeamsByUser() {
  let teams = await axios.get("/api/team/user");
  return teams.data;
}

export async function getMembersByTeam() {
  let members = await axios.get("/api/org/members-with-teams");
  return members.data;
}
