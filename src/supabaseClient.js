import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bhqcazsrvyihxstezope.supabase.co'
const SUPABASE_KEY = 'sb_publishable_o6diki6BV4q9c5eTUk5isg_wm_siew5'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
