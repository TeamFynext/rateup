import { supabase } from './supabase';

export function hasRole(role: string, orgTeamId: string): boolean {
    const { data, error } = await supabase
        .rpc('has_role', {
            orgTeamId,
            role,
        });
}
