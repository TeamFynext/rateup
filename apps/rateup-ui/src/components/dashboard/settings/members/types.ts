/** A team a member belongs to, as `/org/members-with-teams-and-invitation` returns it. */
export interface MemberTeam {
  team_id?: string;
  team_name?: string;
  team_code?: string;
  team_color?: string;
}

export interface MemberRow {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  role?: string;
  roleKey?: string;
  /** Hand-picked additions to, and removals from, the role (src/utils/authz). */
  permissionGrants?: string[];
  permissionDenies?: string[];
  teams?: MemberTeam[];
  status?: string;
  profilePhoto?: string;
  isPaused?: boolean;
}

/** An invitation nobody has accepted yet. */
export interface InvitationRow {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  teams?: MemberTeam[];
}

export interface TeamOption {
  id: string;
  name: string;
  color?: string;
}

export const teamIdOf = (team: MemberTeam): string | undefined => team.team_id;
