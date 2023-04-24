export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json }
    | Json[];

export interface Database {
    public: {
        Tables: {
            org: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string | null
                    owner: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name?: string | null
                    owner?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string | null
                    owner?: string | null
                }
            }
            org_users: {
                Row: {
                    created_at: string | null
                    id: string
                    org_id: string | null
                    role: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    org_id?: string | null
                    role?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    org_id?: string | null
                    role?: string | null
                    user_id?: string | null
                }
            }
            profile: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string | null
                }
                Insert: {
                    created_at?: string | null
                    id: string
                    name?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string | null
                }
            }
            team: {
                Row: {
                    created_at: string
                    id: string
                    name: string
                    org_id: string | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    name?: string
                    org_id?: string | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    name?: string
                    org_id?: string | null
                }
            }
            team_users: {
                Row: {
                    created_at: string | null
                    id: string
                    role: string
                    team_id: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    role?: string
                    team_id: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    role?: string
                    team_id?: string
                    user_id?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            has_org_role: {
                Args: {
                    req_role: string
                    req_org_id: string
                }
                Returns: boolean
            }
            has_role: {
                Args: {
                    req_role: string
                    req_org_team_id: string
                }
                Returns: boolean
            }
            has_team_role: {
                Args: {
                    req_role: string
                    req_team_id: string
                }
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
