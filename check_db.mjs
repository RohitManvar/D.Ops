import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivbkqbeyimxhphiytmxj.supabase.co'
const supabaseKey = 'sb_publishable_zKPAxH9DOvilDeL7CaJVfg_tkNAGlM1'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('documents').select('*').limit(1)
  console.log("Documents Data:", data)
  console.log("Documents Error:", error)
  
  const { data: d2, error: e2 } = await supabase.from('shared_links').select('*').limit(1)
  console.log("SharedLinks Data:", d2)
  console.log("SharedLinks Error:", e2)
}
check()
