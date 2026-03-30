import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ivbkqbeyimxhphiytmxj.supabase.co',
  'sb_publishable_zKPAxH9DOvilDeL7CaJVfg_tkNAGlM1'
)

async function migrate() {
  console.log('🔐 Signing in...')
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'rohitmanvar123@gmail.com',
    password: '#Rohit120',
  })
  if (authError) { console.error('Auth failed:', authError.message); process.exit(1) }
  console.log('✅ Signed in')

  // Add pinned column - we'll handle this via updates since we can't ALTER TABLE from client
  // Instead, we'll store pinned and tags in the existing JSONB-friendly approach
  // Let's just update all existing notes to have pinned=false and tags=[] in a soft way
  
  const { data: notes, error } = await supabase.from('notes').select('id, pinned, tags')
  
  if (error) {
    // If columns don't exist yet, the query itself won't fail - Supabase returns what it can
    console.log('Note: pinned/tags columns may not exist yet.')
    console.log('Please run this SQL in your Supabase SQL Editor:')
    console.log('')
    console.log('ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;')
    console.log("ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';")
    console.log('')
  } else {
    console.log(`✅ Found ${notes.length} notes. Columns accessible.`)
  }

  process.exit(0)
}

migrate()
