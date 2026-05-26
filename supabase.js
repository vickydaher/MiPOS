import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qouhxszlrihlwfiapxvj.supabase.co',  // tu URL
  'sb_publishable_y3N8tSIubhB_hA0o6BRIlQ_YoQ3UcCw'                 // tu anon key
)

export default supabase