// Extracted verbatim from `UsersPage.tsx`. Behaviour is unchanged.

/** A team a user belongs to, as the org members endpoint returns it. */
export interface UserTeam {
  id?: string;
  /** Older rows carry the id under one of these two spellings instead. */
  team_id?: string;
  teamId?: string;
  team_name?: string;
  team_color?: string;
}

export interface SelectedUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  role?: string;
  teams?: UserTeam[];
  status?: string;
  profilePhoto?: string;
  isPaused?: boolean;
  lastActive?: string;
}

/** A team invitation that has not been accepted yet. */
export interface PendingInvitation {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  teams: UserTeam[];
}

export interface TeamOption {
  id: string;
  name: string;
  color?: string;
}
