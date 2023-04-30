import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '../../types/database.types'

export const supabaseClient = createBrowserSupabaseClient<Database>()